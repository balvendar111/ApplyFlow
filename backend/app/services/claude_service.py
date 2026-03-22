"""
LLM service - resume parsing, job summary, match score, cover letter, resume tips, chat.
Uses Anthropic Claude first when API key set; falls back to Ollama on failure or when no key.
"""
import os
import re
import json
import logging
import random
from typing import Optional

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def _call_anthropic(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text if msg.content else ""
    except Exception as e:
        logger.debug("Anthropic call failed: %s", e)
        return None


def _call_ollama(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    try:
        from openai import OpenAI
        client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")
        resp = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        if resp.choices and resp.choices[0].message.content:
            return resp.choices[0].message.content
        return None
    except Exception as e:
        logger.debug("Ollama call failed: %s", e)
        return None


def _call_llm(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    """Try Anthropic first (if key set), then Ollama. Returns None if both fail."""
    if os.getenv("ANTHROPIC_API_KEY"):
        result = _call_anthropic(prompt, max_tokens)
        if result is not None:
            return result
    result = _call_ollama(prompt, max_tokens)
    return result


def _chat_reply_anthropic(system: str, messages: list[dict], max_tokens: int = 1024) -> Optional[str]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return msg.content[0].text if msg.content else None
    except Exception as e:
        logger.debug("chat_reply Anthropic failed: %s", e)
        return None


def _chat_reply_ollama(system: str, messages: list[dict], max_tokens: int = 1024) -> Optional[str]:
    try:
        from openai import OpenAI
        client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")
        ollama_messages = [{"role": "system", "content": system}] + messages
        resp = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=ollama_messages,
            max_tokens=max_tokens,
        )
        if resp.choices and resp.choices[0].message.content:
            return resp.choices[0].message.content
        return None
    except Exception as e:
        logger.debug("chat_reply Ollama failed: %s", e)
        return None


def chat_reply(
    messages: list[dict],
    job_context: str | None = None,
    resume_context: str | None = None,
) -> str:
    """Multi-turn chat. Tries Anthropic first, then Ollama. Returns fallback if both fail."""
    system_parts = [
        "You are the ApplyFlow assistant. Help with job search, applications, resume tips, and match scores.",
        "Be concise. Use plain text only—no markdown, asterisks, or URLs.",
        "When job results are provided below: write a SHORT 1–2 sentence intro only. Do NOT list the jobs in your message—they are shown as cards automatically. Example: 'Here are some Data Scientist roles in Bangalore matching your search.'",
    ]
    if resume_context:
        system_parts.append(f"\nUser's resume context:\n{resume_context}")
    if job_context:
        system_parts.append(f"\nCurrent job search results (use these when relevant):\n{job_context}")
    system = "\n".join(system_parts)

    if os.getenv("ANTHROPIC_API_KEY"):
        result = _chat_reply_anthropic(system, messages)
        if result is not None:
            return result
    result = _chat_reply_ollama(system, messages)
    if result is not None:
        return result
    return "I'm having trouble right now. Please try again later."


RESUME_PARSE_PROMPT = """You are a resume parser. Extract structured data from the resume text below.

RULES:
- name: Full name of the candidate only (e.g. "John Doe", "Balvendra Singh"). Do NOT use section headers like "Profile Summary", "Summary", "Objective", "Experience". The name is usually at the very top of the resume. Do NOT include email, phone, LinkedIn, GitHub, URLs, or @ symbols.
- email: Primary email address. Must match pattern *@*.*
- phone: Primary phone number (with country code if present). Digits only or with + - spaces.
- skills: Extract ALL technical skills, frameworks, tools, and technologies mentioned. Include: programming languages (Python, Java, C++, etc.), frameworks (React, Django, Spring, etc.), databases (SQL, MongoDB, Redis), cloud (AWS, GCP, Azure), ML/AI (TensorFlow, PyTorch, scikit-learn), DevOps (Docker, Jenkins, CI/CD), tools (Git, JIRA, Excel), etc. Extract 15-50+ skills. No generic soft skills like "communication" or "teamwork".
- experience: 2-3 sentence summary of work experience (years, roles, key achievements).
- education: 2-3 sentence summary of education (degrees, institutions, year).

OUTPUT SCHEMA - Return ONLY valid JSON, no markdown:
{{"name": "string or null", "email": "string or null", "phone": "string or null", "skills": ["skill1", "skill2"], "experience": "string or null", "education": "string or null"}}

Resume text:
---
{text}
---

JSON output:"""

def _clean_parsed(parsed: dict) -> dict:
    """Validate and clean parsed resume data."""
    schema = {"name": None, "email": None, "phone": None, "skills": [], "experience": None, "education": None}
    if not isinstance(parsed, dict):
        return schema
    # Name: no @, no URLs, no section headers
    name = parsed.get("name")
    if name and isinstance(name, str) and len(name) < 50:
        bad = ["@", "linkedin", "github", "http", ".com", ".in", "www", "profile", "summary", "objective", "experience", "education", "skills"]
        if not any(b in name.lower() for b in bad):
            schema["name"] = name.strip()
    # Email: valid format, reject phone-merged (e.g. +91-9509428603@...)
    email = parsed.get("email")
    if email:
        s = str(email).strip()
        if s and "@" in s and s.count("@") == 1:
            local = s.split("@", 1)[0]
            if not local.startswith("+") and not re.search(r"\d{10,}", local):
                if sum(1 for c in local if c.isdigit()) <= 5:
                    schema["email"] = s
    # Phone: Indian mobile (10 digits starting 6-9)
    phone = parsed.get("phone")
    if phone:
        digits = "".join(c for c in str(phone) if c.isdigit())
        if len(digits) == 12 and digits.startswith("91") and digits[2] in "6789":
            schema["phone"] = f"+91 {digits[2:7]} {digits[7:]}"
        elif len(digits) >= 10:
            ten = digits[-10:] if len(digits) > 10 else digits
            if ten[0] in "6789":
                schema["phone"] = f"+91 {ten[:5]} {ten[5:]}"
    # Skills: list of strings
    skills = parsed.get("skills")
    if isinstance(skills, list):
        schema["skills"] = [str(s).strip() for s in skills if s and len(str(s)) < 50][:50]
    # Experience, education: strings
    for k in ("experience", "education"):
        v = parsed.get(k)
        if v and isinstance(v, str) and len(v) < 2000:
            schema[k] = v.strip()
    return schema


def parse_resume(raw_text: str) -> Optional[dict]:
    """Parse resume text with Claude, return structured data."""
    if not raw_text or not raw_text.strip():
        return None
    text = _call_llm(RESUME_PARSE_PROMPT.format(text=raw_text[:12000]), max_tokens=1500)
    if not text:
        return None
    try:
        # Extract JSON from response
        text = text.strip()
        if "```" in text:
            for part in text.split("```"):
                part = part.replace("json", "").strip()
                if part.startswith("{"):
                    text = part
                    break
        if not text.startswith("{"):
            start = text.find("{")
            if start >= 0:
                text = text[start:]
        parsed = json.loads(text)
        return _clean_parsed(parsed)
    except Exception:
        return None


def job_summary(description: str) -> Optional[str]:
    """Summarize job description in 2-3 lines."""
    if not description:
        return None
    prompt = f"""Summarize this job description in 2-3 short sentences. Focus on key responsibilities and requirements.
Job description:
---
{description[:3000]}
---
Summary:"""
    return _call_llm(prompt, max_tokens=200)


def match_score(job_description: str, resume_text: str, resume_skills: list = None) -> Optional[int]:
    """Compare job and resume, return relevance score 1-10. Uses Claude + skills fallback."""
    if not job_description:
        return None
    if not resume_text and not resume_skills:
        return None
    # Build resume context - parsed skills help Claude
    resume_ctx = resume_text[:2500] if resume_text else ""
    if resume_skills:
        resume_ctx = f"Skills: {', '.join(resume_skills[:35])}\n\n{resume_ctx}"
    prompt = f"""Rate how well this candidate matches the job on a scale of 1-10.
Consider: skills overlap, experience relevance, role fit.
1-3 = Poor match, 4-6 = Some overlap, 7-10 = Strong match.
Reply with ONLY the number.

Job:
---
{job_description[:2000]}
---

Candidate resume:
---
{resume_ctx[:2500]}
---

Score (1-10):"""
    text = _call_llm(prompt, max_tokens=10)
    if text:
        try:
            n = int("".join(c for c in text.strip() if c.isdigit())[:2] or "5")
            return max(1, min(10, n))
        except Exception:
            pass
    # Fallback: skills-based score when Claude fails
    return _skills_overlap_score(job_description, resume_skills or [], resume_text or "")


def _skills_overlap_score(job_desc: str, resume_skills: list, resume_text: str) -> int:
    """Fallback: compute 1-10 score from skills/keyword overlap."""
    import re
    job_lower = job_desc.lower()
    resume_lower = (resume_text or "").lower()
    # Extract likely skill keywords from job (words that appear in our skill list)
    all_skills = [
        "python", "java", "javascript", "react", "node", "sql", "mongodb", "aws", "docker",
        "machine learning", "ml", "data science", "tensorflow", "pytorch", "pandas", "numpy",
        "scikit-learn", "sklearn", "spark", "hadoop", "airflow", "kafka", "kubernetes",
        "html", "css", "typescript", "angular", "vue", "django", "flask", "fastapi",
        "git", "linux", "rest", "api", "graphql", "redis", "postgresql", "elasticsearch",
        "excel", "power bi", "tableau", "agile", "scrum", "jira", "ci/cd", "jenkins",
    ]
    job_skills = [s for s in all_skills if s in job_lower]
    resume_skills_lower = [str(s).lower() for s in resume_skills]
    resume_text_skills = [s for s in all_skills if s in resume_lower]
    combined_resume = set(resume_skills_lower + resume_text_skills)
    if not job_skills:
        return 5  # Can't compute
    overlap = sum(1 for js in job_skills if any(js in rs or rs in js for rs in combined_resume))
    ratio = overlap / len(job_skills)
    score = max(1, min(10, int(ratio * 10) + 1))
    return score


def cover_letter(job_title: str, company: str, job_description: str, resume_name: str) -> Optional[str]:
    """Generate custom cover letter for the job."""
    prompt = f"""Write a professional cover letter for this job application. Use the applicant name "{resume_name}" or "the applicant" if unknown.
Keep it 3-4 short paragraphs. Be specific to the role.

Job title: {job_title}
Company: {company}

Job description:
---
{job_description[:2500]}
---

Cover letter:"""
    return _call_llm(prompt, max_tokens=800)


def _fallback_resume_tips(job_description: str, resume_skills: list, variation: bool = False) -> str:
    """Fallback tips when Claude fails - extract keywords from job and suggest."""
    import re
    job_lower = (job_description or "").lower()
    job_text = job_description or ""

    # Expanded skill keywords (tech + data/analyst roles)
    common_skills = [
        "python", "java", "javascript", "react", "node", "sql", "mongodb", "aws", "docker",
        "machine learning", "ml", "data science", "tensorflow", "pytorch", "pandas", "numpy",
        "excel", "power bi", "tableau", "agile", "scrum", "jira", "ci/cd", "kubernetes",
        "html", "css", "typescript", "angular", "vue", "django", "flask", "fastapi", "git",
        "data analysis", "data analyst", "statistics", "r programming", "etl", "visualization",
        "reporting", "bi ", "analytics", "spreadsheet", "looker", "snowflake", "redshift",
    ]
    found = [s for s in common_skills if s in job_lower][:10]

    # Extract from Requirements/Qualifications section
    for section in ["requirements?", "qualifications?", "skills?", "must have", "responsibilities?"]:
        m = re.search(rf"{section}\s*[:\n]+([^\n]+(?:\n(?!\s*[A-Z][a-z]+:)[^\n]+)*)", job_text, re.I)
        if m:
            block = m.group(1)[:600].lower()
            for s in ["excel", "sql", "python", "tableau", "power bi", "analytics", "statistics", "communication", "presentation"]:
                if s in block and s not in found:
                    found.append(s)
            break

    # Fallback: grab capitalized multi-word terms that might be skills
    if not found:
        words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b', job_text[:1500])
        skills_from_caps = [w for w in words if len(w) > 2 and w.lower() in common_skills][:6]
        found = list(dict.fromkeys(skills_from_caps))

    skills_str = ", ".join(found) if found else "key terms from the job posting"
    resume_mentioned = []
    if resume_skills:
        resume_lower = [str(s).lower() for s in resume_skills]
        resume_mentioned = [s for s in found if any(s in r or r in s for r in resume_lower)]

    lines = [
        f"Skills to emphasize: {skills_str}" + (" (you have several of these)" if resume_mentioned else ""),
        "Quantify your impact: Add numbers to achievements (e.g., \"Reduced costs by 20%\", \"Led team of 5\")",
        "Match keywords: Use the same terms from the job description in your resume where relevant",
        "Lead with relevant experience: Put the most relevant role or project at the top",
        "Tailor your summary: Align your opening statement with the role's main requirements",
    ]
    alt_tips = [
        "Add a projects section: Highlight work that directly relates to this role",
        "Use action verbs: Start bullets with led, developed, improved, implemented",
        "Address gaps: Briefly explain career breaks or role changes if relevant",
    ]
    if variation:
        random.shuffle(lines)
        if alt_tips and random.random() > 0.5:
            lines.insert(0, random.choice(alt_tips))
    return "\n".join(lines)


def resume_tips(job_description: str, resume_skills: list, variation: bool = False) -> Optional[str]:
    """Suggest which skills to highlight for this job. Uses Claude when available, else keyword-based fallback."""
    if not job_description or not job_description.strip():
        return _fallback_resume_tips("", resume_skills, variation)

    skills_str = ", ".join(resume_skills) if resume_skills else "Not provided"
    prompt = f"""This job requires certain skills. The applicant's resume mentions: {skills_str}

Job description:
---
{job_description[:2000]}
---

Give 4-6 brief, actionable tips on which skills/experience to highlight in the application. Be specific to THIS job - mention actual skills and requirements from the description. Format as a short bullet list, one tip per line starting with •"""
    if variation:
        prompt += "\n\n(Generate different/alternative tips from a new angle - avoid repeating the same suggestions.)"

    result = _call_llm(prompt, max_tokens=500)
    if result and result.strip():
        return result
    logger.info("LLM resume_tips returned empty, using keyword fallback.")
    return _fallback_resume_tips(job_description, resume_skills, variation)
