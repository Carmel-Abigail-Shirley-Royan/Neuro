"""
NeuroGuard - Firebase Authentication Utilities
"""
import os
import firebase_admin
from firebase_admin import auth, credentials

# Initialize Firebase Admin SDK
# Ensure your serviceAccountKey.json is in the backend folder
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"[Auth] Firebase Init Error: {e}")

def decode_token(token: str) -> dict | None:
    """Verify and decode a Firebase ID token sent from the frontend."""
    try:
        # This replaces the manual jwt.decode logic
        decoded_token = auth.verify_id_token(token)
        return {
            "user_id": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "name": decoded_token.get('name', 'User')
        }
    except Exception as e:
        print(f"[Auth] Firebase Token Validation Failed: {e}")
        return None

# These functions are no longer needed for Firebase Auth, 
# as Firebase handles hashing and token creation on the client side.
def hash_password(password: str): pass
def verify_password(password: str, hashed: str): pass
def create_token(user_id: int, email: str): pass