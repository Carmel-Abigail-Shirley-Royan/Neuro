import os
import json
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, auth as firebase_admin_auth

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import init_db, SessionLocal
import models
import auth
from emergency_service import EmergencyService

# ---------------------------------------------------
# LOCAL CONTACT STORAGE (JSON FILE)
# ---------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONTACTS_FILE = os.path.join(BASE_DIR, "local_contacts.json")


def load_local_contacts():
    if not os.path.exists(CONTACTS_FILE):
        return []

    with open(CONTACTS_FILE, "r") as f:
        try:
            return json.load(f)
        except:
            return []


def save_local_contacts(contacts):
    with open(CONTACTS_FILE, "w") as f:
        json.dump(contacts, f, indent=4)

    print(f"💾 Contacts saved to {CONTACTS_FILE}")


# ---------------------------------------------------
# FIREBASE INIT
# ---------------------------------------------------

firebase_json = os.getenv("FIREBASE_CREDENTIALS")

if not firebase_admin._apps:
    if firebase_json:
        cred_dict = json.loads(firebase_json)
        firebase_admin.initialize_app(credentials.Certificate(cred_dict))


# ---------------------------------------------------
# FASTAPI INIT
# ---------------------------------------------------

app = FastAPI(
    title="NeuroGuard API",
    version="1.0.0"
)


# ---------------------------------------------------
# CORS FIX (NETLIFY → LOCALHOST)
# ---------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://neuroguard-2.netlify.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


security = HTTPBearer()
emergency_service = EmergencyService()


# ---------------------------------------------------
# STARTUP
# ---------------------------------------------------

@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ NeuroGuard API Started")


# ---------------------------------------------------
# FIREBASE AUTH
# ---------------------------------------------------

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        decoded_token = firebase_admin_auth.verify_id_token(token)

        return {
            "uid": decoded_token["uid"],
            "user_id": decoded_token["uid"]
        }

    except Exception as e:
        print("Firebase auth error:", e)
        raise HTTPException(status_code=401, detail="Invalid Firebase token")


# ---------------------------------------------------
# AUTH REQUEST MODELS
# ---------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


# ---------------------------------------------------
# AUTH ROUTES
# ---------------------------------------------------

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    db = SessionLocal()

    try:
        existing = db.query(models.User).filter(models.User.email == req.email).first()

        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

        user = models.User(
            email=req.email,
            name=req.name,
            hashed_password=auth.hash_password(req.password)
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        token = auth.create_token(user.id, user.email)

        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name
            }
        }

    finally:
        db.close()


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    db = SessionLocal()

    try:
        user = db.query(models.User).filter(models.User.email == req.email).first()

        if not user or not auth.verify_password(req.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = auth.create_token(user.id, user.email)

        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name
            }
        }

    finally:
        db.close()


# ---------------------------------------------------
# CONTACTS (JSON FILE STORAGE)
# ---------------------------------------------------

class ContactRequest(BaseModel):
    name: str
    phone: str


@app.get("/api/contacts")
async def get_contacts(user=Depends(get_current_user)):
    contacts = load_local_contacts()
    return contacts


@app.post("/api/contacts")
async def add_contact(req: ContactRequest, user=Depends(get_current_user)):
    contacts = load_local_contacts()

    new_contact = {
        "id": len(contacts) + 1,
        "name": req.name,
        "phone": req.phone
    }

    contacts.append(new_contact)
    save_local_contacts(contacts)

    return new_contact


@app.delete("/api/contacts/{contact_id}")
async def delete_contact(contact_id: int, user=Depends(get_current_user)):
    contacts = load_local_contacts()

    contacts = [c for c in contacts if c["id"] != contact_id]

    save_local_contacts(contacts)

    return {"message": "Contact deleted"}


# ---------------------------------------------------
# EMERGENCY TRIGGER
# ---------------------------------------------------

class EmergencyRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sensor_data: Optional[dict] = None


@app.post("/api/emergency/trigger")
async def trigger_emergency(req: EmergencyRequest, user=Depends(get_current_user)):

    contacts = load_local_contacts()

    email_list = [c["phone"] for c in contacts]

    if not email_list:
        return {"message": "No contacts found", "results": []}

    location_url = ""

    if req.latitude and req.longitude:
        location_url = f"https://www.google.com/maps?q={req.latitude},{req.longitude}"

    results = await emergency_service.send_alerts(email_list, location_url)

    return {
        "message": f"Alerts sent to {len(email_list)} contacts",
        "results": results
    }


# ---------------------------------------------------
# HISTORY
# ---------------------------------------------------

@app.get("/api/history")
async def get_history(user=Depends(get_current_user)):
    db = SessionLocal()

    try:
        events = db.query(models.SeizureEvent).order_by(
            models.SeizureEvent.timestamp.desc()
        ).all()

        return [
            {
                "id": e.id,
                "timestamp": str(e.timestamp),
                "pulse": e.pulse,
                "temperature": e.temperature,
                "emg": e.emg,
                "gyro_x": e.gyro_x,
                "gyro_y": e.gyro_y,
                "gyro_z": e.gyro_z,
                "location": e.location,
            }
            for e in events
        ]

    finally:
        db.close()


# ---------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------

@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }