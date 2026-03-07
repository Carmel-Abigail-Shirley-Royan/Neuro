import resend
from typing import List


class EmergencyService:

    def __init__(self):
        resend.api_key = "re_3i2PxAhA_32KKCawLEXfxQ5E74Lu97nqJ"
        print("✅ Resend Email Service Initialized")

    async def send_alerts(self, email_list: List[str], location_url: str = ""):

        results = []

        for email in email_list:

            try:

                resend.Emails.send({
                    "from": "onboarding@resend.dev",
                    "to": email,
                    "subject": "🚨 URGENT: NeuroGuard Seizure Alert",
                    "html": f"""
                    <div style="font-family:sans-serif;border:2px solid red;padding:20px">
                        <h2 style="color:red">Emergency Alert</h2>

                        <p>NeuroGuard detected a potential seizure event.</p>

                        <p><b>Please check on the patient immediately.</b></p>

                        {f'<p><a href="{location_url}">View Location</a></p>' if location_url else ""}

                        <hr>

                        <small>Automated alert from NeuroGuard System</small>
                    </div>
                    """
                })

                print(f"✅ Email sent to {email}")

                results.append({
                    "email": email,
                    "status": "sent"
                })

            except Exception as e:

                print(f"❌ Failed for {email}: {e}")

                results.append({
                    "email": email,
                    "status": "failed",
                    "error": str(e)
                })

        return results