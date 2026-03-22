"""Admin API - list users (admin only)."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.schemas import User, Resume, AppliedJob, SavedJob
from app.auth import get_current_user
from app.api.auth import ADMIN_EMAIL

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    """Only allow admin email."""
    if not (ADMIN_EMAIL and user.email.lower().strip() == ADMIN_EMAIL):
        raise HTTPException(403, "Admin access required")
    return user


@router.get("/users")
async def list_users(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """
    List all users with usage stats and profile info from resume. Admin only.
    Returns: id, email, created_at, name, phone, resume_email, skills, resumes, applied, saved.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        resume_count = db.query(Resume).filter(Resume.user_id == u.id).count()
        applied_count = db.query(AppliedJob).filter(AppliedJob.user_id == u.id).count()
        saved_count = db.query(SavedJob).filter(SavedJob.user_id == u.id).count()
        # Latest resume for name, contact, skills
        latest = db.query(Resume).filter(Resume.user_id == u.id).order_by(Resume.created_at.desc()).first()
        name = phone = resume_email = skills = None
        if latest:
            name = latest.name
            phone = latest.phone
            resume_email = latest.email
            if latest.skills:
                try:
                    skills = json.loads(latest.skills) if isinstance(latest.skills, str) else latest.skills
                except Exception:
                    skills = []
        result.append({
            "id": u.id,
            "email": u.email,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "name": name,
            "phone": phone,
            "resume_email": resume_email,
            "skills": skills or [],
            "resumes": resume_count,
            "applied": applied_count,
            "saved": saved_count,
        })
    return {"users": result}
