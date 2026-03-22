"""Application tracking: apply, status update, saved jobs, CSV export."""
import csv
import io
from fastapi import APIRouter, Body, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime

from app.models.database import SessionLocal
from app.models.schemas import AppliedJob, SavedJob, User
from app.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["apply"])


class ApplyRequest(BaseModel):
    external_id: str
    title: str
    company: str
    apply_url: str


class SaveRequest(BaseModel):
    external_id: str
    title: str
    company: str
    apply_url: str
    source: str = ""


class StatusRequest(BaseModel):
    status: str  # applied, interview, rejected


@router.post("/apply")
async def track_apply(req: ApplyRequest = Body(...), user: User = Depends(get_current_user)):
    """Track a job application."""
    db = SessionLocal()
    try:
        applied = AppliedJob(
            user_id=user.id,
            external_id=req.external_id,
            title=req.title,
            company=req.company,
            apply_url=req.apply_url,
            status="applied",
        )
        db.add(applied)
        db.commit()
        db.refresh(applied)
        return {"success": True, "apply_url": req.apply_url, "id": applied.id}
    finally:
        db.close()


@router.patch("/applied/{record_id}/status")
async def update_status(record_id: int, req: StatusRequest = Body(...), user: User = Depends(get_current_user)):
    """Update application status."""
    if req.status not in ("applied", "interview", "rejected"):
        return {"success": False, "error": "Invalid status"}
    db = SessionLocal()
    try:
        applied = db.query(AppliedJob).filter(AppliedJob.id == record_id, AppliedJob.user_id == user.id).first()
        if not applied:
            return {"success": False, "error": "Not found"}
        applied.status = req.status
        db.commit()
        return {"success": True}
    finally:
        db.close()


@router.post("/save")
async def save_job(req: SaveRequest = Body(...), user: User = Depends(get_current_user)):
    """Save job for later (bookmark)."""
    db = SessionLocal()
    try:
        existing = db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.external_id == req.external_id).first()
        if existing:
            return {"success": True, "saved": True}
        saved = SavedJob(
            user_id=user.id,
            external_id=req.external_id,
            title=req.title,
            company=req.company,
            apply_url=req.apply_url,
            source=req.source,
        )
        db.add(saved)
        db.commit()
        return {"success": True, "saved": True}
    finally:
        db.close()


@router.delete("/save")
async def unsave_job(external_id: str = Query(...), user: User = Depends(get_current_user)):
    """Remove saved job."""
    db = SessionLocal()
    try:
        db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.external_id == external_id).delete()
        db.commit()
        return {"success": True}
    finally:
        db.close()


@router.delete("/applied")
async def clear_applied(user: User = Depends(get_current_user)):
    """Clear all applied jobs for the current user."""
    db = SessionLocal()
    try:
        db.query(AppliedJob).filter(AppliedJob.user_id == user.id).delete()
        db.commit()
        return {"success": True}
    finally:
        db.close()


@router.get("/applied")
async def get_applied(status: str | None = Query(None), user: User = Depends(get_current_user)):
    """Get applied jobs, optional status filter."""
    db = SessionLocal()
    try:
        q = db.query(AppliedJob).filter(AppliedJob.user_id == user.id).order_by(AppliedJob.applied_at.desc())
        if status:
            q = q.filter(AppliedJob.status == status)
        items = q.all()
        return {
            "jobs": [
                {
                    "id": x.id,
                    "external_id": x.external_id,
                    "title": x.title,
                    "company": x.company,
                    "apply_url": x.apply_url,
                    "status": x.status,
                    "applied_at": x.applied_at.isoformat() if x.applied_at else None,
                }
                for x in items
            ]
        }
    finally:
        db.close()


@router.delete("/saved")
async def clear_saved(user: User = Depends(get_current_user)):
    """Clear all saved jobs for the current user."""
    db = SessionLocal()
    try:
        db.query(SavedJob).filter(SavedJob.user_id == user.id).delete()
        db.commit()
        return {"success": True}
    finally:
        db.close()


@router.get("/saved")
async def get_saved(user: User = Depends(get_current_user)):
    """Get saved jobs."""
    db = SessionLocal()
    try:
        items = db.query(SavedJob).filter(SavedJob.user_id == user.id).order_by(SavedJob.saved_at.desc()).all()
        return {
            "jobs": [
                {
                    "id": x.id,
                    "external_id": x.external_id,
                    "title": x.title,
                    "company": x.company,
                    "apply_url": x.apply_url,
                    "source": x.source,
                    "saved_at": x.saved_at.isoformat() if x.saved_at else None,
                }
                for x in items
            ]
        }
    finally:
        db.close()


@router.get("/applied/export")
async def export_applied_csv(user: User = Depends(get_current_user)):
    """Export applied jobs as CSV."""
    db = SessionLocal()
    try:
        items = db.query(AppliedJob).filter(AppliedJob.user_id == user.id).order_by(AppliedJob.applied_at.desc()).all()
        output = io.StringIO()
        w = csv.writer(output)
        w.writerow(["Title", "Company", "Status", "Applied At", "Apply URL"])
        for x in items:
            w.writerow([
                x.title or "",
                x.company or "",
                x.status or "",
                x.applied_at.strftime("%Y-%m-%d %H:%M") if x.applied_at else "",
                x.apply_url or "",
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=applied_jobs.csv"},
        )
    finally:
        db.close()
