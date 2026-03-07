import asyncio
import json
import math
import os
from datetime import datetime
from typing import Optional, List

from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, auth as firebase_admin_auth

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import init_db, SessionLocal
import models
import auth
from emergency_service import EmergencyService

# Firebase Init
firebase_json = os.getenv("FIREBASE_CREDENTIALS")

if not firebase_admin._apps:
    if firebase_json:
        cred_dict = json.loads(firebase_json)
        firebase_admin.initialize_app(credentials.Certificate(cred_dict))

app = FastAPI(
    title="NeuroGuard API",
    version="1.0.0"
)

# CORS FIX
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://neuroguard-2.netlify.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex="https://.*\\.netlify\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

emergency_service = EmergencyService()

# -------------------------
# STARTUP
# -------------------------

@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ NeuroGuard API Started")

# -------------------------
# FIREBASE AUTH
# -------------------------

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

# -------------------------
# AUTH REQUEST MODELS
# -------------------------

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

# -------------------------
# AUTH ENDPOINTS
# -------------------------

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

# -------------------------
# CONTACTS
# -------------------------

class ContactRequest(BaseModel):
    name: str
    phone: str

@app.get("/api/contacts")
async def get_contacts(user=Depends(get_current_user)):
    db = SessionLocal()

    try:
        contacts = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user["user_id"]
        ).all()

        return [
            {"id": c.id, "name": c.name, "phone": c.phone}
            for c in contacts
        ]

    finally:
        db.close()

@app.post("/api/contacts")
async def add_contact(req: ContactRequest, user=Depends(get_current_user)):
    db = SessionLocal()

    try:
        contact = models.EmergencyContact(
            user_id=user["user_id"],
            name=req.name,
            phone=req.phone
        )

        db.add(contact)
        db.commit()
        db.refresh(contact)

        return {
            "id": contact.id,
            "name": contact.name,
            "phone": contact.phone
        }

    finally:
        db.close()

@app.delete("/api/contacts/{contact_id}")
async def delete_contact(contact_id: int, user=Depends(get_current_user)):
    db = SessionLocal()

    try:
        contact = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.id == contact_id,
            models.EmergencyContact.user_id == user["user_id"]
        ).first()

        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        db.delete(contact)
        db.commit()

        return {"message": "Contact deleted"}

    finally:
        db.close()

# -------------------------
# EMERGENCY TRIGGER
# -------------------------

class EmergencyRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sensor_data: Optional[dict] = None

@app.post("/api/emergency/trigger")
async def trigger_emergency(req: EmergencyRequest, user=Depends(get_current_user)):
    db = SessionLocal()

    try:
        contacts = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user["user_id"]
        ).all()

        emails = [c.phone for c in contacts]

        location_url = ""

        if req.latitude and req.longitude:
            location_url = f"https://maps.google.com/?q={req.latitude},{req.longitude}"

        results = await emergency_service.send_alerts(emails, location_url)

        return {
            "message": "Emergency alerts sent",
            "results": results
        }

    finally:
        db.close()

# -------------------------
# HISTORY
# -------------------------

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
                "gyro_y": e.gro_y,
                "gyro_z": e.gyro_z,
                "location": e.location,
            }
            for e in events
        ]

    finally:
        db.close()

# -------------------------
# HEALTH CHECK
# -------------------------

@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }