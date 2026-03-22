from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    """User account for auth."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(256), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    """Password reset token (expires in 1 hour)."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    """Cached job from external APIs."""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True)  # e.g. "indeed_123"
    title = Column(String(512), nullable=False)
    company = Column(String(256))
    location = Column(String(256))
    description = Column(Text)
    apply_url = Column(String(1024))
    salary = Column(String(128))
    job_type = Column(String(64))  # Full-time, Part-time, Contract
    experience = Column(String(128))
    source = Column(String(64))  # indeed, naukri, adzuna, etc.
    posted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class Resume(Base):
    """Uploaded resume metadata + Claude parsed data."""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(256), nullable=False)
    file_path = Column(String(512), nullable=False)
    name = Column(String(256))
    email = Column(String(256))
    phone = Column(String(64))
    skills = Column(Text)  # JSON array as string
    experience = Column(Text)  # JSON
    education = Column(Text)  # JSON
    raw_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppliedJob(Base):
    """Jobs user has applied to + status."""
    __tablename__ = "applied_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    external_id = Column(String(255), index=True)  # For jobs not in cache
    title = Column(String(512))
    company = Column(String(256))
    apply_url = Column(String(1024))
    status = Column(String(64), default="applied")  # applied, interview, rejected
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SavedJob(Base):
    """Jobs saved for later (bookmarks)."""
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    external_id = Column(String(255), index=True)
    title = Column(String(512))
    company = Column(String(256))
    apply_url = Column(String(1024))
    source = Column(String(64))
    saved_at = Column(DateTime, default=datetime.utcnow)
