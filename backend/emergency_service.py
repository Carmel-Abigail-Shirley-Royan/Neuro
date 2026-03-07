import os
import resend

class EmergencyService:
    def __init__(self):
        resend.api_key = os.getenv("RESEND_API_KEY")

    async def send_alerts(self, email_list: list, location_url: str = ""):
        results = []

        if not email_list:
            print("⚠️ No emergency contacts found")
            return {"status": "no_contacts"}

        try:
            params = {
                "from": "NeuroGuard <onboarding@resend.dev>",
                "to": email_list,
                "subject": "🚨 NEUROGUARD ALERT: Seizure Detected",
                "html": f"""
                <h2>🚨 Emergency Alert</h2>
                <p>A seizure event has been detected by the NeuroGuard monitoring system.</p>
                <p><strong>Location:</strong></p>
                <p><a href="{location_url}">{location_url}</a></p>
                <br>
                <p>Please check on the patient immediately.</p>
                """
            }

            response = resend.Emails.send(params)

            print("✅ Emergency emails sent")
            results.append(response)

        except Exception as e:
            print(f"❌ Resend Error: {e}")
            results.append(str(e))

        return results