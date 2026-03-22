"""Auth: register, login, Google OAuth, me, password reset."""
import logging
import os
import re
import secrets
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.limiter import limiter
from app.models.schemas import User, PasswordResetToken
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.email_utils import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
# Optional: extra client IDs for dev/staging (comma-separated)
_extra_ids = os.getenv("GOOGLE_CLIENT_ID_EXTRA", "")
GOOGLE_CLIENT_IDS = [GOOGLE_CLIENT_ID] if GOOGLE_CLIENT_ID else []
if _extra_ids:
    GOOGLE_CLIENT_IDS.extend(s.strip() for s in _extra_ids.split(",") if s.strip())


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info (email) for profile display."""
    return {"user": {"id": user.id, "email": user.email}}


@router.post("/register")
@limiter.limit("10/minute")
async def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    """Create account. Password min 6 chars."""
    if not EMAIL_RE.match(req.email or ""):
        raise HTTPException(400, "Invalid email format")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": {"id": user.id, "email": user.email}}


@router.post("/login")
@limiter.limit("15/minute")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    """Login with email + password."""
    if not EMAIL_RE.match(req.email or ""):
        raise HTTPException(400, "Invalid email format")
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": {"id": user.id, "email": user.email}}


class GoogleAuthRequest(BaseModel):
    credential: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


RESET_BASE_URL = os.getenv("RESET_PASSWORD_BASE_URL", "http://localhost:5173")
RESET_EXPIRE_HOURS = 1


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email. Always returns success to prevent email enumeration."""
    if not EMAIL_RE.match(req.email or ""):
        raise HTTPException(400, "Invalid email format")
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if user:
        token_str = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=RESET_EXPIRE_HOURS)
        prt = PasswordResetToken(user_id=user.id, token=token_str, expires_at=expires)
        db.add(prt)
        db.commit()
        reset_url = f"{RESET_BASE_URL.rstrip('/')}/reset-password?token={token_str}"
        body_html = f"""
        <p>You requested a password reset for ApplyFlow.</p>
        <p><a href="{reset_url}">Reset your password</a></p>
        <p>This link expires in {RESET_EXPIRE_HOURS} hour(s).</p>
        <p>If you didn't request this, ignore this email.</p>
        """
        body_text = f"Reset your password: {reset_url}\n\nThis link expires in {RESET_EXPIRE_HOURS} hour(s)."
        sent = send_email(user.email, "ApplyFlow — Reset your password", body_html, body_text)
        if not sent:
            # Log for dev (SMTP not configured)
            import logging
            logging.getLogger(__name__).info("Reset link (dev): %s", reset_url)
    return {"message": "If that email exists, we sent a reset link."}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with token from email."""
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    prt = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()
    if not prt:
        raise HTTPException(400, "Invalid or expired reset link. Request a new one.")
    user = db.query(User).filter(User.id == prt.user_id).first()
    if not user:
        raise HTTPException(400, "Invalid reset link.")
    user.hashed_password = hash_password(req.new_password)
    db.delete(prt)
    db.commit()
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": {"id": user.id, "email": user.email}}


@router.post("/google")
async def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Sign in / sign up with Google. Send ID token from frontend."""
    if not GOOGLE_CLIENT_IDS:
        raise HTTPException(503, "Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend .env")
    if not req.credential or not req.credential.strip():
        raise HTTPException(400, "Missing credential")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = None
        last_err = None
        for cid in GOOGLE_CLIENT_IDS:
            try:
                idinfo = id_token.verify_oauth2_token(
                    req.credential, google_requests.Request(), cid
                )
                break
            except ValueError as e:
                last_err = e
                continue
        if idinfo is None:
            logger.warning("Google token verification failed: %s (tried %d client IDs)", last_err, len(GOOGLE_CLIENT_IDS))
            raise HTTPException(
                401,
                "Invalid Google token. Ensure VITE_GOOGLE_CLIENT_ID (frontend) matches GOOGLE_CLIENT_ID (backend), "
                "and that http://localhost:5173 is in Google Cloud Console > Credentials > Authorized JavaScript origins.",
            )
        email = (idinfo.get("email") or "").lower().strip()
        if not email:
            raise HTTPException(400, "Google account has no email")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Google auth error: %s", e)
        raise HTTPException(401, "Google sign-in failed")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_hex(32)),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": {"id": user.id, "email": user.email}}
