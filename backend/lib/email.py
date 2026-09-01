"""
SmartVault Email Service Adapter (Resend)
Isolated backend-only email dispatch layer. Never exposes API keys to frontend or logs.
"""

import os
import logging
import asyncio
from typing import Dict, Any, Optional

logger = logging.getLogger("smartvault.email")


class EmailService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY", "")
        self.sender_email = os.getenv("SENDER_EMAIL", "onboarding@resend.dev")

    @property
    def is_configured(self) -> bool:
        """Returns True if a real Resend API key is configured."""
        return bool(self.api_key and not self.api_key.startswith("re_placeholder"))

    def get_status(self) -> Dict[str, Any]:
        """Returns public status without exposing API key secrets."""
        return {
            "provider": "resend",
            "configured": self.is_configured,
            "sender": self.sender_email
        }

    async def send_transactional_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send transactional email in background executor.
        Safely captures failures without leaking provider keys.
        """
        if not self.is_configured:
            logger.info(f"[Resend Email Simulated] Dispatch to {to_email} with subject '{subject}' (API key not configured)")
            return {"status": "simulated", "id": "sim_email_dev_mode"}

        def _sync_send():
            import resend
            resend.api_key = self.api_key
            params = {
                "from": self.sender_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                params["text"] = text_content
            return resend.Emails.send(params)

        try:
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(None, _sync_send)
            logger.info(f"Dispatched email to {to_email} via Resend. ID: {res.get('id', 'unknown')}")
            return {"status": "sent", "id": res.get("id")}
        except Exception as e:
            logger.error(f"Resend email dispatch error: {e}")
            return {"status": "error", "error": "Email delivery failed"}


# Global email service singleton
email_service = EmailService()
