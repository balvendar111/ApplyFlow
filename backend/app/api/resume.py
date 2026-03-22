from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import os
import shutil
import uuid
import json
import logging
from pathlib import Path

from app.services.resume_service import process_and_save_resume

logger = logging.getLogger(__name__)
from app.models.database import SessionLocal, get_db
from app.models.schemas import Resume as ResumeModel, User
from app.auth import get_current_user

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload resume (PDF or DOCX), extract text, parse with Claude, save to DB."""
    logger.info("Resume upload request: user_id=%s, filename=%s", user.id, file.filename)
    try:
        if not file.filename:
            raise HTTPException(400, "No file selected")
        ext = Path(file.filename).suffix.lower()
        if ext not in [".pdf", ".docx"]:
            raise HTTPException(400, "Only PDF and DOCX allowed")
        # Use absolute path for resumes dir
        resume_dir = Path(os.getenv("RESUME_STORAGE_PATH", "./resumes")).resolve()
        resume_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{Path(file.filename).stem}_{uuid.uuid4().hex[:8]}{ext}"
        path = resume_dir / safe_name
        with path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        logger.info("File saved to %s, processing...", path)
        result = process_and_save_resume(file.filename, path, user_id=user.id)
        logger.info("Resume processed successfully for user %s", user.id)
        return {"success": True, "resume": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Resume upload failed: %s", e)
        err_msg = str(e) if str(e) else "Upload failed"
        raise HTTPException(500, err_msg)


@router.get("")
async def get_resume(user: User = Depends(get_current_user)):
    """Get current resume metadata (most recent upload for this user)."""
    db = SessionLocal()
    try:
        resume = (
            db.query(ResumeModel)
            .filter(ResumeModel.user_id == user.id)
            .order_by(ResumeModel.created_at.desc())
            .first()
        )
        if not resume:
            return {"resume": None}
        return {
            "resume": {
                "id": resume.id,
                "filename": resume.filename,
                "name": resume.name,
                "email": resume.email,
                "phone": resume.phone,
                "skills": json.loads(resume.skills) if resume.skills else [],
                "experience": resume.experience,
                "education": resume.education,
            }
        }
    finally:
        db.close()


@router.delete("")
async def delete_resume(user: User = Depends(get_current_user)):
    """Delete current resume (most recent for this user). Removes from DB and deletes file."""
    db = SessionLocal()
    try:
        resume = (
            db.query(ResumeModel)
            .filter(ResumeModel.user_id == user.id)
            .order_by(ResumeModel.created_at.desc())
            .first()
        )
        if not resume:
            raise HTTPException(404, "No resume to delete")
        file_path = Path(resume.file_path)
        db.delete(resume)
        db.commit()
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass
        return {"success": True, "message": "Resume deleted"}
    except HTTPException:
        raise
    finally:
        db.close()
