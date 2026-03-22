"""
Resume service - extract text from PDF/DOCX, parse with Claude, store in DB.
Fallback: regex extraction when Claude fails or no API key.
"""
import os
import re
import json
from pathlib import Path
from typing import Optional

from app.services.claude_service import parse_resume
from app.models.database import SessionLocal
from app.models.schemas import Resume as ResumeModel

RESUME_DIR = Path(os.getenv("RESUME_STORAGE_PATH", "./resumes"))


def extract_text_pdf(file_path: Path) -> str:
    """Extract text from PDF. Tries pdfplumber -> PyPDF2 -> pymupdf."""
    # 1. pdfplumber (often best)
    try:
        import pdfplumber
        text = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text.append(t)
        if text:
            return "\n".join(text)
    except Exception:
        pass
    # 2. PyPDF2
    try:
        import PyPDF2
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text.append(t)
            if text:
                return "\n".join(text)
    except Exception:
        pass
    # 3. pymupdf (fitz) - works on more PDFs
    try:
        import fitz
        doc = fitz.open(file_path)
        text = []
        for page in doc:
            t = page.get_text()
            if t:
                text.append(t)
        doc.close()
        if text:
            return "\n".join(text)
    except Exception:
        pass
    return ""


def extract_text_docx(file_path: Path) -> str:
    """Extract text from DOCX."""
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception:
        return ""


def _clean_extracted_text(text: str) -> str:
    """Clean PDF extraction artifacts (cid:, etc.) but preserve line structure."""
    if not text:
        return ""
    text = re.sub(r"\(cid:\d+\)", " ", text)  # PDF encoding artifacts like (cid:239)
    text = re.sub(r"[ \t]+", " ", text)  # collapse spaces within lines
    return text.strip()


def extract_text(file_path: Path) -> str:
    """Extract text from PDF or DOCX."""
    ext = file_path.suffix.lower()
    raw = ""
    if ext == ".pdf":
        raw = extract_text_pdf(file_path)
    elif ext == ".docx":
        raw = extract_text_docx(file_path)
    return _clean_extracted_text(raw)


# Common skills to detect in resume text (for fallback extraction)
SKILL_KEYWORDS = [
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "R", "Scala", "Kotlin", "Rust", "PHP", "Ruby", "Swift",
    # Web / Frontend
    "React", "Angular", "Vue", "Node.js", "HTML", "CSS", "Tailwind", "Bootstrap", "jQuery", "Redux", "Next.js", "Nuxt",
    # Backend
    "Django", "Flask", "FastAPI", "Spring", "Express", "ASP.NET", "Laravel", "Rails",
    # Databases
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "SQLite", "Cassandra", "Elasticsearch", "DynamoDB",
    # Cloud & DevOps
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Jenkins", "CI/CD", "Terraform", "Ansible", "Linux", "Git", "GitHub", "GitLab",
    # Data & ML
    "Machine Learning", "Deep Learning", "Data Science", "TensorFlow", "PyTorch", "scikit-learn", "Scikit-learn", "Keras",
    "Pandas", "NumPy", "Numpy", "Matplotlib", "Seaborn", "Spark", "Hadoop", "Hive", "Airflow", "Kafka", "ETL",
    # Tools & Other
    "Excel", "Power BI", "Tableau", "JIRA", "Agile", "Scrum", "REST API", "GraphQL", "Microservices",
    "Selenium", "Jest", "Cypress", "Pytest", "JUnit", "Maven", "Gradle",
]

def _is_valid_email(s: str) -> bool:
    """Reject emails that look like phone merged, or malformed."""
    if not s or "@" not in s or s.count("@") != 1:
        return False
    local, domain = s.split("@", 1)
    local = local.strip()
    # Reject if local part starts with + or has 10+ consecutive digits (phone merged)
    if local.startswith("+") or re.search(r"\d{10,}", local):
        return False
    # Reject if local is mostly digits (>5 digits)
    if sum(1 for c in local if c.isdigit()) > 5:
        return False
    return bool(re.match(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", s))


def _is_valid_phone(s: str) -> bool:
    """Validate Indian mobile: 10 digits starting with 6-9, optional +91."""
    digits = re.sub(r"\D", "", s)
    if len(digits) == 10:
        return digits[0] in "6789"
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2] in "6789"
    return False


def _format_phone(s: str) -> str:
    """Normalize to +91 XXXXX XXXXX format."""
    digits = re.sub(r"\D", "", s)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    digits = digits[-10:] if len(digits) > 10 else digits
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91 {digits[:5]} {digits[5:]}"
    return s.strip()


def _fallback_parse(raw_text: str) -> dict:
    """Fallback: regex + heuristic extract when Claude fails."""
    out = {"name": None, "email": None, "phone": None, "skills": [], "experience": None, "education": None}
    if not raw_text or len(raw_text) < 10:
        return out
    text_lower = raw_text.lower()
    lines = [l.strip() for l in raw_text.split("\n") if len(l.strip()) > 2]

    # Email - prefer valid emails (no phone merged)
    all_emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", raw_text)
    for em in all_emails:
        if _is_valid_email(em):
            out["email"] = em.strip()
            break

    # Phone - Indian mobile only: must start with 6-9 (avoid matching "10" + number from "Class 10")
    phones = re.findall(r"(?:\+91[- ]?)?[6-9]\d{9}", raw_text)  # Only valid mobile patterns
    if phones and _is_valid_phone(phones[0]):
        out["phone"] = _format_phone(phones[0])

    # Name: use email hint + line search. Email "balvendarsingh@gmail.com" -> search for "Balvendra"
    email_local = ""
    if all_emails:
        email_local = re.sub(r"\d", "", all_emails[0].split("@")[0].lower())  # "balvendarsingh"
    name_hint = email_local[:10] if len(email_local) >= 4 else ""  # "balvendars"

    skip_patterns = [
        "@", "http", "linkedin", "github", ".com", "www", "cid:",
        "profile summary", "objective", "experience", "education", "skills",
        "projects", "certification", "achievement", "academic", "python", "java",
    ]

    # Strategy 1: Find line containing name hint from email (e.g. "balvendra")
    if name_hint and len(name_hint) >= 5:
        for line in lines[:15]:
            line_clean = line.strip()
            if name_hint in line_clean.lower() and len(line_clean) < 50:
                if not any(p in line_clean.lower() for p in skip_patterns) and "@" not in line_clean:
                    words = [w for w in re.sub(r"[^\w\s-]", " ", line_clean).split() if w.isalpha() or "-" in w]
                    if 2 <= len(words) <= 5:
                        out["name"] = " ".join(w.strip("-") for w in words)
                        break

    # Strategy 2: First line that looks like name (often at top of resume)
    if not out["name"]:
        for line in lines[:8]:
            line_clean = line.strip()
            if len(line_clean) < 4 or len(line_clean) > 40:
                continue
            if any(p in line_clean.lower() for p in skip_patterns):
                continue
            if re.search(r"\d", line_clean) or "@" in line_clean:
                continue
            words = [w for w in re.sub(r"[^\w\s-]", " ", line_clean).split() if w]
            if 2 <= len(words) <= 5 and all(w.replace("-", "").isalpha() for w in words):
                out["name"] = " ".join(words)
                break

    # Strategy 3: Derive from email (e.g. balvendarsingh -> Balvendra Singh)
    if not out["name"] and email_local and len(email_local) >= 6:
        parts = re.findall(r"[a-z]+", email_local)
        if parts:
            combined = "".join(parts)
            if "singh" in combined or "kumar" in combined:
                rest = combined.replace("singh", "").replace("kumar", "")
                if rest:
                    out["name"] = rest.capitalize() + " Singh"

    # Skills: (1) from "Skills:" / "Technical Skills:" section, (2) from keyword matching
    found_skills = []
    for head in ["technical skills", "skills", "tech stack", "technologies", "core competencies", "expertise"]:
        idx = text_lower.find(head)
        if idx >= 0:
            start = idx + len(head)
            end = min(start + 800, len(raw_text))
            chunk = raw_text[start:end]
            for sep in [",", "|", ";", "\n", "•", "-", "–", "/"]:
                for part in chunk.split(sep):
                    item = re.sub(r"[^\w\s\+\.#\-]", " ", part).strip()
                    skip = {"and", "or", "the", "etc", "years", "experience", "proficient", "familiar"}
                    if 2 <= len(item) <= 40 and not item.isdigit() and item.lower() not in skip:
                        found_skills.append(item)
            break
    for skill in SKILL_KEYWORDS:
        if skill.lower() in text_lower and skill not in found_skills:
            found_skills.append(skill)
    out["skills"] = list(dict.fromkeys(s.strip() for s in found_skills if s.strip()))[:40]

    # Experience: extract years
    exp_matches = re.findall(r"(\d+[\+]?\s*(?:years?|yrs?|yr))\s*(?:of)?\s*(?:experience|exp)?", text_lower, re.I)
    if exp_matches:
        out["experience"] = f"{exp_matches[0]} of experience."

    # Education: extract degrees
    edu_keywords = ["b.tech", "btech", "m.tech", "mtech", "b.e", "be", "mca", "bca", "b.sc", "m.sc", "mba", "b.com", "phd"]
    found_edu = [k.title() for k in edu_keywords if k in text_lower]
    if found_edu:
        out["education"] = ", ".join(found_edu[:3]) + " or equivalent."

    return out


def _merge_parsed(claude_result: Optional[dict], fallback_result: dict) -> dict:
    """Merge Claude + fallback: prefer Claude when valid, else fallback."""
    merged = {"name": None, "email": None, "phone": None, "skills": [], "experience": None, "education": None}
    for k in merged:
        c_val = claude_result.get(k) if claude_result else None
        f_val = fallback_result.get(k)
        if k == "email":
            merged[k] = c_val if (c_val and _is_valid_email(str(c_val))) else (f_val if (f_val and _is_valid_email(str(f_val))) else None)
        elif k == "phone":
            merged[k] = c_val if (c_val and _is_valid_phone(str(c_val))) else (f_val if (f_val and _is_valid_phone(str(f_val))) else None)
        elif c_val is not None and c_val != [] and c_val != "":
            merged[k] = c_val
        elif f_val is not None and f_val != [] and f_val != "":
            merged[k] = f_val
    # Skills: merge and deduplicate
    all_skills = list(dict.fromkeys((claude_result or {}).get("skills", []) + fallback_result.get("skills", [])))
    merged["skills"] = all_skills[:50] if all_skills else []
    return merged


def _sanitize_contact(parsed: dict) -> dict:
    """Final validation: reject malformed email/phone before save."""
    out = dict(parsed)
    if parsed.get("email") and not _is_valid_email(str(parsed["email"])):
        out["email"] = None
    if parsed.get("phone"):
        p = str(parsed["phone"]).strip()
        if not _is_valid_phone(p):
            out["phone"] = None
        else:
            out["phone"] = _format_phone(p)
    return out


def process_and_save_resume(filename: str, file_path: Path, user_id: int) -> dict:
    """Extract text, parse with Claude + fallback, save to DB. Returns resume metadata."""
    raw_text = extract_text(file_path)
    claude_parsed = parse_resume(raw_text) if raw_text and raw_text.strip() else None
    fallback_parsed = _fallback_parse(raw_text or "")
    parsed = _merge_parsed(claude_parsed, fallback_parsed)
    parsed = _sanitize_contact(parsed)

    db = SessionLocal()
    try:
        resume = ResumeModel(
            user_id=user_id,
            filename=filename,
            file_path=str(file_path),
            name=parsed.get("name"),
            email=parsed.get("email"),
            phone=parsed.get("phone"),
            skills=json.dumps(parsed.get("skills") or []),
            experience=parsed.get("experience"),
            education=parsed.get("education"),
            raw_text=raw_text[:50000] if raw_text else None,
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)

        return {
            "id": resume.id,
            "filename": resume.filename,
            "name": resume.name,
            "email": resume.email,
            "phone": resume.phone,
            "skills": json.loads(resume.skills) if resume.skills else [],
            "experience": resume.experience,
            "education": resume.education,
        }
    finally:
        db.close()
