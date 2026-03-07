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

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_admin_auth

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import init_db, get_db, SessionLocal
from model_loader import SeizurePredictor
from serial_reader import SerialReader
from emergency_service import EmergencyService
import auth
import json
import models
import resend
resend.api_key = os.getenv("RESEND_API_KEY")

# Load environment variables from .env file
load_dotenv()


# Get Firebase JSON from environment variable
firebase_json = os.getenv("FIREBASE_CREDENTIALS")

# Convert string to dictionary
cred_dict = json.loads(firebase_json)

# Initialize Firebase
cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)

db_firestore = firestore.client()

# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────
app = FastAPI(
    title="NeuroGuard API",
    description="Real-Time AI Powered Seizure Detection & Emergency Response",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",      # Local React testing
    "https://your-site.netlify.app", # YOUR ACTUAL NETLIFY URL (Change this!)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    db = SessionLocal()
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
                    # 1. Save to database (as you already do)
    
                    # 2. Trigger the Twilio Studio Flow automatically
                    # For now, we use the verified doctor number from your screenshot
                    await emergency_service.trigger_emergency_call("+916374134569", "Carmel")
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
    # Data from User's Arduino Format:
    # EMG (raw ADC), Heart (raw ADC), GyroX, GyroY, GyroZ, Temp (Celsius)

    # Pulse: User sends 'Heart' as raw analogRead (0-1023).
    # Mapping raw ADC to realistic BPM (e.g., 60 - 140 range)
    heart_raw = raw.get("pulse_raw", 512)
    pulse_bpm = int(60 + (heart_raw / 1023.0) * 80)

    # Temperature: Requested to keep constant at 36.6°C
    temp_c = 36.6

    # EMG: analog 0-1023 → millivolts
    emg_raw = raw.get("emg_voltage", 0)
    emg_mv = round((emg_raw / 1023.0) * 3300.0, 2)

    # Gyroscope: raw values
    gyro_x = round(raw.get("gyro_x", 0), 2)
    gyro_y = round(raw.get("gyro_y", 0), 2)
    gyro_z = round(raw.get("gyro_z", 0), 2)

    # Derived: vibration_intensity
    vibration_intensity = round(math.sqrt(gyro_x ** 2 + gyro_y ** 2 + gyro_z ** 2) / 1000.0, 4)

    # SpO2
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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # This verifies the token directly with Google/Firebase
        decoded_token = firebase_admin_auth.verify_id_token(token)
        # Return a dictionary that matches what your endpoints expect
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "user_id": decoded_token["uid"] # Reusing uid for your SQLite user_id field
        }
    except Exception as e:
        print(f"Firebase Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token"
        )

# ─────────────────────────────────────────────
# Sensor Endpoints
# ─────────────────────────────────────────────
@app.get("/api/sensor/latest")
async def get_latest_sensor(user=Depends(get_current_user)):
    data = serial_reader.last_data
    if not data:
        # Return simulated data if no serial connection
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
        # We use 'uid' because it is a string from Firebase
        contacts = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user["uid"]
        ).all()
        return [{"id": c.id, "name": c.name, "phone": c.phone} for c in contacts]
    finally:
        db.close()

@app.post("/api/contacts")
async def add_contact(req: ContactRequest, user=Depends(get_current_user)):
    db = SessionLocal()
    try:
        contact = models.EmergencyContact(
            user_id=user["uid"], # Use the Firebase UID
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

# ─────────────────────────────────────────────
# Updated Emergency Trigger in main.py
# ─────────────────────────────────────────────
import resend
import os

# Ensure this is in your .env file
resend.api_key = os.getenv("RESEND_API_KEY")

@app.post("/api/emergency/trigger")
async def trigger_emergency(req: EmergencyRequest, user=Depends(get_current_user)):
    db = SessionLocal()
    try:
        # Fetch contacts for the logged-in user
        contacts = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user["uid"]
        ).all()

        if not contacts:
            return {"status": "error", "message": "No contacts found"}

        # Extract user name safely to avoid KeyError
        user_name = user.get('name') or user.get('display_name') or "NeuroGuard User"

        for contact in contacts:
            # 1. Clean the email string to remove hidden spaces
            target_email = str(contact.phone).strip() 

            # 2. Add a simple check to skip invalid entries
            if "@" not in target_email:
                print(f"[Skip] '{target_email}' is not a valid email.")
                continue

            html_body = f"""
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ff3366; border-radius: 10px;">
                    <h2 style="color: #ff3366;">🚨 NEUROGUARD ALERT</h2>
                    <p>A seizure has been detected for <b>{user_name}</b>.</p>
                    <p><a href="https://www.google.com/maps?q={req.latitude},{req.longitude}">View Location</a></p>
                </div>
            """

            # 3. Use the cleaned variable here
            resend.Emails.send({
                "from": "NeuroGuard <onboarding@resend.dev>", 
                "to": [target_email], 
                "subject": "🚨 EMERGENCY: Seizure Detected",
                "html": html_body
            })

        return {"status": "success", "message": "Emergency emails dispatched"}
    
    except Exception as e:
        print(f"Resend Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

# ─────────────────────────────────────────────
# History
# ─────────────────────────────────────────────
@app.get("/api/history")
async def get_history(user=Depends(get_current_user)):
    db = SessionLocal()
    try:
        events = db.query(models.SeizureEvent).order_by(
            models.SeizureEvent.timestamp.desc()
        ).limit(100).all()
        return [{
            "id": e.id,
            "timestamp": e.timestamp.isoformat(),
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
    
    # NEW: Immediately send the last known data to the dashboard
    if serial_reader.last_data:
        processed = process_sensor_data(serial_reader.last_data)
        await websocket.send_json(processed)
        
    try:
        while True:
            await websocket.receive_text()
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
    """Return feature spec loaded from the pkl file."""
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

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)