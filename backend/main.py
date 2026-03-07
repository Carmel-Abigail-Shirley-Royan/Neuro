"""
NeuroGuard - Real-Time AI Powered Seizure Detection & Emergency Response System
Main FastAPI Application
"""

import asyncio
import json
import math
import os
from datetime import datetime
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- FIREBASE AUTH ADDITION ---
import firebase_admin
from firebase_admin import credentials, auth as firebase_admin_auth

# Initialize Firebase (Render & Local Hybrid)
firebase_json = os.getenv("FIREBASE_CREDENTIALS")
if not firebase_admin._apps:
    if firebase_json:
        try:
            cred_dict = json.loads(firebase_json)
            firebase_admin.initialize_app(credentials.Certificate(cred_dict))
            print("✅ Firebase initialized via Environment Variable")
        except Exception as e:
            print(f"❌ Firebase Init Error: {e}")
    elif os.path.exists("serviceAccountKey.json"):
        firebase_admin.initialize_app(credentials.Certificate("serviceAccountKey.json"))
        print("✅ Firebase initialized via local file")
# ------------------------------

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import init_db, get_db, SessionLocal
from model_loader import SeizurePredictor
from serial_reader import SerialReader
from emergency_service import EmergencyService
import auth
import models

print(f"📂 DATABASE PATH: {os.path.abspath('neuroguard.db')}")

# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────
app = FastAPI(
    title="NeuroGuard API",
    description="Real-Time AI Powered Seizure Detection & Emergency Response",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Globals
predictor = SeizurePredictor()
serial_reader = SerialReader()
emergency_service = EmergencyService()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

manager = ConnectionManager()

# ─────────────────────────────────────────────
# Startup / Shutdown
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    init_db()
    predictor.load_model()
    print(f"[Startup] Using Serial Port: {os.getenv('SERIAL_PORT')} at {os.getenv('SERIAL_BAUDRATE')} baud")
    asyncio.create_task(serial_broadcast_loop())

@app.on_event("shutdown")
async def shutdown_event():
    serial_reader.close()

# ─────────────────────────────────────────────
# Serial Broadcast Loop
# ─────────────────────────────────────────────
async def serial_broadcast_loop():
    """Continuously read from serial port and broadcast to all WebSocket clients."""
    while True:
        try:
            data = serial_reader.read_data()
            if data:
                # Convert raw voltages to proper units
                processed = process_sensor_data(data)

                # ML Prediction
                prediction = predictor.predict(processed)
                processed["prediction"] = prediction
                processed["timestamp"] = datetime.utcnow().isoformat()

                # Store to DB if seizure
                if prediction == "Seizure Detected":
                    db = SessionLocal()
                    try:
                        event = models.SeizureEvent(
                            timestamp=datetime.utcnow(),
                            pulse=processed.get("pulse_bpm", 0),
                            temperature=processed.get("temperature_c", 0),
                            emg=processed.get("emg_mv", 0),
                            gyro_x=processed.get("gyro_x", 0),
                            gyro_y=processed.get("gyro_y", 0),
                            gyro_z=processed.get("gyro_z", 0),
                            location=processed.get("location", ""),
                        )
                        db.add(event)
                        db.commit()
                    finally:
                        db.close()

                await manager.broadcast(processed)
            await asyncio.sleep(0.1)
        except Exception as e:
            print(f"[SerialLoop] Error: {e}")
            await asyncio.sleep(1)

def process_sensor_data(raw: dict) -> dict:
    """Convert raw analog voltages or pass-through values to proper units."""
    heart_raw = raw.get("pulse_raw", 512)
    pulse_bpm = int(60 + (heart_raw / 1023.0) * 80)
    temp_c = 36.6
    emg_raw = raw.get("emg_voltage", 0)
    emg_mv = round((emg_raw / 1023.0) * 3300.0, 2)
    gyro_x = round(raw.get("gyro_x", 0), 2)
    gyro_y = round(raw.get("gyro_y", 0), 2)
    gyro_z = round(raw.get("gyro_z", 0), 2)
    vibration_intensity = round(math.sqrt(gyro_x ** 2 + gyro_y ** 2 + gyro_z ** 2) / 1000.0, 4)
    spo2 = float(raw.get("spo2", 98.0))

    return {
        "pulse_bpm": pulse_bpm,
        "temperature_c": temp_c,
        "spo2": spo2,
        "vibration_intensity": vibration_intensity,
        "emg_mv": emg_mv,
        "gyro_x": gyro_x,
        "gyro_y": gyro_y,
        "gyro_z": gyro_z,
        "emg_raw": emg_raw,
    }

# ─────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == req.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = models.User(
            email=req.email,
            name=req.name,
            hashed_password=auth.hash_password(req.password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = auth.create_token(user.id, user.email)
        return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}
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
        return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}
    finally:
        db.close()

# --- FIREBASE AUTH UPDATE ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Verify directly with Firebase Admin SDK
        decoded_token = firebase_admin_auth.verify_id_token(token)
        return {
            "uid": decoded_token["uid"],
            "user_id": decoded_token["uid"] 
        }
    except Exception as e:
        print(f"Firebase Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
# ----------------------------

# ─────────────────────────────────────────────
# Sensor Endpoints
# ─────────────────────────────────────────────
@app.get("/api/sensor/latest")
async def get_latest_sensor(user=Depends(get_current_user)):
    data = serial_reader.last_data
    if not data:
        import random
        data = {
            "pulse_voltage": random.randint(400, 700),
            "temp_voltage": random.randint(150, 250),
            "emg_voltage": random.randint(50, 300),
            "gyro_x": round(random.uniform(-2, 2), 3),
            "gyro_y": round(random.uniform(-2, 2), 3),
            "gyro_z": round(random.uniform(-2, 2), 3),
        }
    return process_sensor_data(data)

# ─────────────────────────────────────────────
# Emergency Contacts
# ─────────────────────────────────────────────
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
        return [{"id": c.id, "name": c.name, "phone": c.phone} for c in contacts]
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
        return {"id": contact.id, "name": contact.name, "phone": contact.phone}
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

# ─────────────────────────────────────────────
# Emergency Trigger
# ─────────────────────────────────────────────
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
        phones = [c.phone for c in contacts]
        location_url = ""
        if req.latitude and req.longitude:
            location_url = f"https://maps.google.com/?q={req.latitude},{req.longitude}"
        results = await emergency_service.send_alerts(phones, location_url)
        return {"message": "Emergency alerts sent", "results": results}
    finally:
        db.close()

# ─────────────────────────────────────────────
# History
# ─────────────────────────────────────────────
# In main.py, your History endpoint should be this simple:
@app.get("/api/history")
async def get_history(user=Depends(get_current_user)):
    db = SessionLocal()
    try:
        # Grabs ALL 112 rows because they don't have UIDs yet
        events = db.query(models.SeizureEvent).order_by(
            models.SeizureEvent.timestamp.desc()
        ).all()
        
        return [{
            "id": e.id,
            "timestamp": str(e.timestamp), # Convert string timestamp for JSON
            "pulse": e.pulse,
            "temperature": e.temperature,
            "emg": e.emg,
            "gyro_x": e.gyro_x,
            "gyro_y": e.gyro_y,
            "gyro_z": e.gyro_z,
            "location": e.location,
        } for e in events]
    finally:
        db.close()

# ─────────────────────────────────────────────
# WebSocket
# ─────────────────────────────────────────────
@app.websocket("/ws/sensor")
async def websocket_sensor(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "location":
                    serial_reader.last_location = {
                        "lat": msg.get("lat"),
                        "lng": msg.get("lng")
                    }
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ─────────────────────────────────────────────
# Model Info
# ─────────────────────────────────────────────
@app.get("/api/model/info")
async def model_info():
    return {
        "loaded": predictor.is_loaded(),
        "feature_names": predictor.get_feature_names(),
        "has_model_weights": predictor.model is not None,
    }

# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "serial_connected": serial_reader.is_connected(),
        "model_loaded": predictor.is_loaded(),
        "feature_names": predictor.get_feature_names(),
        "timestamp": datetime.utcnow().isoformat()
    }