from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./apply_job_bot.db")
# Render/Heroku use postgres://; SQLAlchemy 2 + psycopg2 need postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _column_exists(conn, table: str, column: str) -> bool:
    """Check if column exists in table (SQLite or PostgreSQL)."""
    from sqlalchemy import text
    if "sqlite" in DATABASE_URL:
        cur = conn.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in cur.fetchall())
    cur = conn.execute(text(
        "SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column})
    return cur.fetchone() is not None


def _run_auth_migration():
    """Add user_id to existing tables if missing (for pre-auth DB)."""
    from sqlalchemy import text
    from app.auth import hash_password

    with engine.begin() as conn:
        for table in ("resumes", "applied_jobs", "saved_jobs"):
            try:
                if not _column_exists(conn, table, "user_id"):
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER"))
            except Exception:
                pass  # Table might not exist
        try:
            r = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            if r == 0:
                pw = hash_password("migrate123")
                conn.execute(
                    text("INSERT INTO users (email, hashed_password) VALUES (:e, :p)"),
                    {"e": "migrated@applyflow.local", "p": pw}
                )
        except Exception:
            pass
        for table in ("resumes", "applied_jobs", "saved_jobs"):
            try:
                conn.execute(text(f"UPDATE {table} SET user_id = 1 WHERE user_id IS NULL"))
            except Exception:
                pass


def init_db():
    """Create all tables and run migrations."""
    from . import schemas  # noqa: F401 - register models
    Base.metadata.create_all(bind=engine)
    # Migrate existing DB: add user_id, create default user, backfill
    try:
        _run_auth_migration()
    except Exception:
        pass  # Fresh DB may not have old tables; ignore


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
