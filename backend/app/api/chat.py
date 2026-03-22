"""
Chat API - ApplyFlow assistant with job search integration.
"""
import json
import re
from fastapi import APIRouter, Body, Depends, Request
from pydantic import BaseModel

from app.auth import get_current_user
from app.models.database import SessionLocal
from app.models.schemas import Resume as ResumeModel, User
from app.config.job_profiles import JOB_PROFILES
from app.services.job_aggregator import search_jobs
from app.services.claude_service import chat_reply
from app.limiter import limiter

router = APIRouter(prefix="/chat", tags=["chat"])

# Job-search trigger keywords
JOB_SEARCH_TRIGGERS = (
    "job", "jobs", "find", "search", "hiring", "openings", "looking", "apply",
    "data scientist", "frontend", "backend", "fullstack", "full stack",
    "software engineer", "developer", "engineer", "ml engineer", "ai engineer",
    "product manager", "devops", "data engineer", "cloud engineer",
    "in bangalore", "in mumbai", "in delhi", "in hyderabad", "in chennai",
    "in pune", "at bangalore", "at mumbai", "remote",
)

# Map phrases to JOB_PROFILES ids (lowercase)
ROLE_TO_PROFILE: dict[str, str] = {}
for p in JOB_PROFILES:
    ROLE_TO_PROFILE[p["id"].lower()] = p["id"]
    for kw in p.get("keywords", []):
        ROLE_TO_PROFILE[kw.lower()] = p["id"]
# Add common aliases
ROLE_TO_PROFILE.update({
    "ds": "data_scientist", "data science": "data_scientist",
    "react": "frontend", "front end": "frontend",
    "node": "backend", "back end": "backend",
    "mern": "fullstack", "mean": "fullstack",
    "sre": "devops", "ml": "ml_engineer",
})


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] | None = None


def _detect_job_search_intent(message: str) -> bool:
    msg_lower = message.lower().strip()
    if len(msg_lower) < 3:
        return False
    return any(trigger in msg_lower for trigger in JOB_SEARCH_TRIGGERS)


def _parse_role_and_location(message: str) -> tuple[list[str], str]:
    """Extract profile ids and location from message. Returns (profiles, location)."""
    msg_lower = message.lower()
    profiles: list[str] = []
    location = ""

    # Location patterns: "in X", "at X", "X jobs" (city at end)
    loc_patterns = [
        r"\b(in|at)\s+([a-z][a-z\s\-]+?)(?:\s+(?:jobs?|positions?|roles?)|\.|$)",
        r"jobs?\s+(?:in|at)\s+([a-z][a-z\s\-]+)",
    ]
    for pat in loc_patterns:
        m = re.search(pat, msg_lower, re.I)
        if m:
            loc = (m.group(2) if m.lastindex >= 2 else m.group(1)).strip()
            if len(loc) > 2:
                location = loc

    # Role: check known profiles
    for phrase, profile_id in sorted(ROLE_TO_PROFILE.items(), key=lambda x: -len(x[0])):
        if phrase in msg_lower and profile_id not in profiles:
            profiles.append(profile_id)

    if not profiles:
        profiles = ["software_engineer"]
    return profiles[:3], location


@router.post("/message")
@limiter.limit("30/minute")
async def post_message(
    request: Request,
    req: ChatRequest = Body(...),
    user: User = Depends(get_current_user),
):
    """Chat with ApplyFlow assistant. Returns reply and optionally job results."""
    message = (req.message or "").strip()
    if not message:
        return {"reply": "Please ask a question.", "jobs": None}

    history = req.history or []
    # Truncate to last 10 messages (5 turns)
    history = history[-10:]
    messages = [{"role": m.role, "content": m.content} for m in history if m.role and m.content]
    messages.append({"role": "user", "content": message})

    resume_context = ""
    db = SessionLocal()
    try:
        resume = (
            db.query(ResumeModel)
            .filter(ResumeModel.user_id == user.id)
            .order_by(ResumeModel.created_at.desc())
            .first()
        )
        if resume:
            skills = json.loads(resume.skills) if resume.skills else []
            resume_context = f"Name: {resume.name or 'N/A'}. Skills: {', '.join(skills[:20])}. Experience: {resume.experience or 'N/A'}."
    finally:
        db.close()

    jobs: list[dict] = []
    job_context = ""

    if _detect_job_search_intent(message):
        profiles, location = _parse_role_and_location(message)
        results, _ = await search_jobs(
            profiles=profiles,
            location=location or None,
            page=1,
        )
        jobs = results[:10]
        if jobs:
            lines = []
            for j in jobs[:10]:
                lines.append(f"- {j.get('title', '')} at {j.get('company', '')} | {j.get('location', '')}")
            job_context = "\n".join(lines)

    reply = chat_reply(
        messages=messages,
        job_context=job_context if job_context else None,
        resume_context=resume_context if resume_context else None,
    )

    return {"reply": reply, "jobs": jobs if jobs else None}
