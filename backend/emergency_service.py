import os
import resend
from typing import List

class EmergencyService:
    def __init__(self):
        # Using the API key from your successful test
        self.api_key = "re_3i2PxAhA_32KKCawLEXfxQ5E74Lu97nqJ"
        resend.api_key = self.api_key
        print("✅ Resend Email Service Initialized")

    async def send_alerts(self, email_list: List[str], location_url: str = ""):
        """Sends an emergency email to your contacts."""
        results = []
        for email in email_list:
            try:
                # Using your verified 'from' and 'to' logic
                response = resend.Emails.send({
                    "from": "onboarding@resend.dev",
                    "to": email, 
                    "subject": "🚨 URGENT: NeuroGuard Seizure Alert",
                    "html": f"""
                        <div style="font-family: sans-serif; border: 2px solid red; padding: 20px;">
                            <h2 style="color: red;">Emergency Alert Detected</h2>
                            <p>NeuroGuard has detected a potential seizure event.</p>
                            <p><strong>Action Required:</strong> Please check on the patient immediately.</p>
                            {f'<p><strong>Location:</strong> <a href="{location_url}">View on Google Maps</a></p>' if location_url else ''}
                            <hr>
                            <p><small>Automated notification from the NeuroGuard System.</small></p>
                        </div>
                    """
                })
                results.append({"email": email, "status": "sent"})
                print(f"✅ Alert successfully sent to {email}")
            except Exception as e:
                results.append({"email": email, "status": "failed", "error": str(e)})
                print(f"❌ Failed to send to {email}: {e}")
        
        return results