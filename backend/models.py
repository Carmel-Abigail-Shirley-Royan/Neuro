"""
NeuroGuard - SQLAlchemy ORM Models
"""

from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    contacts = relationship("EmergencyContact", back_populates="user")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)

    user = relationship("User", back_populates="contacts")


class SeizureEvent(Base):
    __tablename__ = "seizure_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    pulse = Column(Float, default=0)
    temperature = Column(Float, default=0)
    emg = Column(Float, default=0)
    gyro_x = Column(Float, default=0)
    gyro_y = Column(Float, default=0)
    gyro_z = Column(Float, default=0)
    location = Column(String, default="")
