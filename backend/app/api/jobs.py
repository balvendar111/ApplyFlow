from fastapi import APIRouter, Query, Body, Depends, Request, HTTPException
from pydantic import BaseModel
from app.config.job_profiles import JOB_PROFILES, EXPERIENCE_LEVELS
from app.services.job_aggregator import search_jobs, get_job_detail
from app.services.claude_service import job_summary, match_score, cover_letter, resume_tips
from app.models.database import SessionLocal
from app.models.schemas import Resume as ResumeModel, User
from app.auth import get_current_user
from app.limiter import limiter

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobSummaryRequest(BaseModel):
    description: str


class MatchScoreRequest(BaseModel):
    job_description: str


class CoverLetterRequest(BaseModel):
    title: str
    company: str
    description: str
    applicant_name: str = "The applicant"


class ResumeTipsRequest(BaseModel):
    job_description: str
    skills: list[str] = []
    variation: bool = False  # When True, request alternative/different tips (for Regenerate)


@router.get("/profiles")
async def get_profiles(user: User = Depends(get_current_user)):
    """Returns all predefined job profiles + experience levels."""
    return {
        "profiles": JOB_PROFILES,
        "experience_levels": EXPERIENCE_LEVELS,
    }


@router.get("/search")
async def search(
    user: User = Depends(get_current_user),
    profiles: str | None = Query(None, description="Comma-separated profile IDs"),
    q: str | None = Query(None, description="Custom search keyword"),
    location: str | None = Query(None),
    posted: str | None = Query(None, description="1d, 3d, 7d, 14d, 30d - Last 24h, 3 days, week, 14 days, month"),
    job_type: str | None = Query(None, description="Full-time, Part-time, Contract"),
    experience: str | None = Query(None),
    min_salary: str | None = Query(None),
    page: int = Query(1, ge=1),
):
    profile_list = [p.strip() for p in profiles.split(",")] if profiles else None
    results, using_mock = await search_jobs(
        profiles=profile_list,
        q=q,
        location=location,
        posted=posted,
        job_type=job_type,
        experience=experience,
        min_salary=min_salary,
        page=page,
    )
    # has_more: likely more pages when we got a good batch (APIs return 10-30 per page)
    has_more = len(results) >= 15
    return {"jobs": results, "total": len(results), "page": page, "has_more": has_more, "using_mock": using_mock}


@router.get("/detail/{external_id}")
async def get_detail(external_id: str, user: User = Depends(get_current_user)):
    """Get full job by external_id from cache. Returns 404 if not found (e.g. direct link to old search)."""
    job = get_job_detail(external_id)
    if not job:
        raise HTTPException(404, "Job not found or expired. Search again to view.")
    return {"job": job}


@router.post("/summary")
@limiter.limit("30/minute")
async def get_job_summary(request: Request, req: JobSummaryRequest = Body(...), user: User = Depends(get_current_user)):
    """Claude: 2-line summary of job description."""
    summary = job_summary(req.description)
    return {"summary": summary or "Summary not available."}


@router.post("/match-score")
@limiter.limit("30/minute")
async def get_match_score(request: Request, req: MatchScoreRequest = Body(...), user: User = Depends(get_current_user)):
    """Resume vs job relevance 1-10. Uses Claude + skills fallback."""
    db = SessionLocal()
    try:
        resume = db.query(ResumeModel).filter(ResumeModel.user_id == user.id).order_by(ResumeModel.created_at.desc()).first()
        if not resume:
            return {"score": None, "has_resume": False}
        resume_text = resume.raw_text or ""
        resume_skills = []
        if resume.skills:
            import json
            try:
                resume_skills = json.loads(resume.skills) if isinstance(resume.skills, str) else resume.skills
            except Exception:
                pass
        score = match_score(req.job_description, resume_text, resume_skills)
        return {"score": score, "has_resume": bool(resume_text or resume_skills)}
    finally:
        db.close()


@router.post("/cover-letter")
@limiter.limit("20/minute")
async def get_cover_letter(request: Request, req: CoverLetterRequest = Body(...), user: User = Depends(get_current_user)):
    """Claude: Custom cover letter draft. Uses resume name if applicant_name empty."""
    applicant_name = req.applicant_name
    if not applicant_name:
        db = SessionLocal()
        try:
            resume = db.query(ResumeModel).filter(ResumeModel.user_id == user.id).order_by(ResumeModel.created_at.desc()).first()
            applicant_name = resume.name if resume and resume.name else "the applicant"
        finally:
            db.close()
    letter = cover_letter(req.title, req.company, req.description, applicant_name)
    return {"cover_letter": letter or "Cover letter could not be generated."}


@router.post("/resume-tips")
async def get_resume_tips(req: ResumeTipsRequest = Body(...), user: User = Depends(get_current_user)):
    """Claude: Skills to highlight for this job. variation=True for alternate tips on Regenerate."""
    tips = resume_tips(req.job_description, req.skills, req.variation)
    return {"tips": tips or "Tips could not be generated."}
