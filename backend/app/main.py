import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env: project root first, then backend/ as fallback
_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_root / ".env")
load_dotenv(_root / "backend" / ".env")  # backend-specific overrides

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.models.database import init_db
from app.limiter import limiter
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.jobs import router as jobs_router
from app.api.resume import router as resume_router
from app.api.apply import router as apply_router
from app.api.chat import router as chat_router

app = FastAPI(
    title="ApplyFlow API",
    version="1.0",
    description="ApplyFlow — Job search across platforms with AI-powered resume parsing & cover letters",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: allow dev + production origins from env
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0"}


# Init DB on startup
@app.on_event("startup")
def startup():
    init_db()
    # Log auth config status (don't print secrets)
    _gid = os.getenv("GOOGLE_CLIENT_ID", "")
    if _gid.strip():
        print("Google Sign-In: configured")
    else:
        print("Google Sign-In: not configured (set GOOGLE_CLIENT_ID in .env)")


# API routes (must be before static catch-all)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(jobs_router)
app.include_router(resume_router)
app.include_router(apply_router)
app.include_router(chat_router)


# Serve frontend static files in production (when SERVE_FRONTEND=true)
_default_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
_frontend_dist = Path(os.getenv("FRONTEND_DIST", str(_default_dist)))
if os.getenv("SERVE_FRONTEND", "").lower() in ("1", "true", "yes") and _frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    @app.get("/")
    def index():
        return FileResponse(_frontend_dist / "index.html")

    app.mount("/assets", StaticFiles(directory=_frontend_dist / "assets"), name="assets")

    @app.get("/favicon.svg")
    def favicon():
        return FileResponse(_frontend_dist / "favicon.svg")

    @app.get("/{full_path:path}")
    def spa_catchall(full_path: str):
        """SPA fallback - serve index.html for non-API routes."""
        return FileResponse(_frontend_dist / "index.html")
