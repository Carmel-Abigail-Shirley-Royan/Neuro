import os
import resend  # Make sure to run: pip install resend

class EmergencyService:
    def __init__(self):
        # Update your .env to have RESEND_API_KEY instead of FAST2SMS
        resend.api_key = os.getenv("RESEND_API_KEY")

    async def send_email_alert(self, email_address: str, lat: float, lng: float, patient_name: str = "User"):
        # Google Maps link for the recipient
        maps_link = f"https://www.google.com/maps?q={lat},{lng}"
        
        try:
            # We are sending to the 'email_address' which is stored in your 'phone' column
            params = {
                "from": "NeuroGuard <onboarding@resend.dev>", # Default for trial accounts
                "to": [email_address],
                "subject": "🚨 EMERGENCY: Seizure Detected",
                "html": f"""
                    <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ff3366; border-radius: 10px;">
                        <h2 style="color: #ff3366;">NEUROGUARD ALERT</h2>
                        <p>A seizure has been detected for <strong>{patient_name}</strong>.</p>
                        <p><strong>Immediate action may be required.</strong></p>
                        <div style="margin: 20px 0;">
                            <a href="{maps_link}" style="background: #ff3366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                VIEW LIVE LOCATION 📍
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #666;">Coordinates: {lat}, {lng}</p>
                    </div>
                """
            }

            # Trigger the email send
            email = resend.Emails.send(params)
            print(f"[Resend Success] Email sent to {email_address}: {email}")
            return email

        except Exception as e:
            print(f"[Resend Error] Failed to send to {email_address}: {e}")
            return None