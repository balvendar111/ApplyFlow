"""Email utilities for password reset. Uses SMTP if configured."""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", os.getenv("FROM_EMAIL", "noreply@applyflow.com"))


def send_email(to: str, subject: str, body_html: str, body_text: str = "") -> bool:
    """Send email via SMTP. Returns True if sent, False otherwise (e.g. SMTP not configured)."""
    if not SMTP_HOST or not SMTP_USER:
        logger.info("SMTP not configured. Would send: to=%s subject=%s", to, subject)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        if body_text:
            msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        return True
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to, e)
        return False
