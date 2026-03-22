"""
Job aggregator - fetches from multiple APIs, merges, deduplicates.
Uses in-memory cache (15 min TTL) for same search.
"""
import os
import logging

logger = logging.getLogger(__name__)
import re
import hashlib
import time
from typing import Optional
from datetime import datetime, timedelta, timezone
import httpx

from app.config.job_profiles import JOB_PROFILES, EXPERIENCE_LEVELS

# In-memory cache: {cache_key: (results, timestamp)}
_job_cache: dict = {}
# Detail cache: {external_id: (job, timestamp)} for job detail page
_job_detail_cache: dict = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


def _get_cache_key(profiles: list, q: str, location: str, posted: str, job_type: str, experience: str, min_salary: str, page: int) -> str:
    """Generate cache key for search params including page."""
    key_str = f"{','.join(sorted(profiles or []))}|{q}|{location}|{posted}|{job_type}|{experience}|{min_salary}|{page}"
    return hashlib.md5(key_str.encode()).hexdigest()


def _jsearch_experience(val) -> str | None:
    """Extract experience string from JSearch job_required_experience field."""
    if not val:
        return None
    if isinstance(val, str):
        return val.strip() or None
    if isinstance(val, dict):
        return val.get("required_experience_label") or val.get("required_experience") or None
    return None


def _extract_from_description(desc: str) -> tuple[str | None, list[str]]:
    """Extract experience and requirement bullets from job description."""
    if not desc or len(desc) < 20:
        return None, []
    text = desc[:3000]
    exp = None
    exp_patterns = [
        r"(\d+[\+\-]?\s*(?:to\s+)?\d*\s*years?\s*(?:of\s+)?experience)",
        r"(?:experience|exp)[:\s]+(\d+[\+\-]?\s*(?:–|-|to)\s*\d*\s*years?)",
        r"(\d+[\+\-]\s*years?\s*experience)",
        r"(?:min(?:imum)?\s+)?(\d+[\+\-]?)\s*years?\s*(?:of\s+)?experience",
    ]
    for p in exp_patterns:
        m = re.search(p, text, re.I)
        if m:
            exp = m.group(1).strip()
            break
    reqs = []
    for section in ["requirements?", "qualifications?", "must have", "key requirements?", "skills? required"]:
        m = re.search(rf"{section}\s*[:\n]+([^\n]+(?:\n(?!\s*[A-Z][a-z]+:)[^\n]+)*)", text, re.I)
        if m:
            block = m.group(1)[:800]
            for line in re.split(r"[\n•\-\*]", block):
                s = line.strip().strip(".-").strip()
                if len(s) > 15 and len(s) < 150:
                    reqs.append(s)
            if reqs:
                break
    return exp, reqs[:8]


def _resolve_keywords(profile_ids: list[str]) -> list[str]:
    """Convert profile IDs to search keywords."""
    if not profile_ids:
        return []
    profile_map = {p["id"]: p["keywords"] for p in JOB_PROFILES}
    keywords = []
    for pid in profile_ids:
        if pid in profile_map:
            keywords.extend(profile_map[pid])
    return list(set(keywords))


def _matches_job_type(job: dict, job_type_filter: str) -> bool:
    """Check if job matches job type filter (Full-time, Part-time, Contract)."""
    if not job_type_filter:
        return True
    jt = (job.get("job_type") or "").strip().lower()
    if not jt:
        return True  # No job_type in API → keep job (avoid over-filtering)
    ft = job_type_filter.lower()
    if ft in ("full-time", "fulltime"):
        return "full" in jt or "full-time" in jt
    if ft in ("part-time", "parttime"):
        return "part" in jt or "part-time" in jt
    if "contract" in ft:
        return "contract" in jt or "contractor" in jt
    return ft in jt


def _matches_experience(job: dict, exp_filter: str) -> bool:
    """Check if job experience matches filter (fresher, 1_3, 3_5, 5_plus)."""
    if not exp_filter:
        return True
    exp_text = (job.get("experience") or "").lower()
    desc = (job.get("description") or "")[:2000].lower()
    combined = exp_text + " " + desc
    if not combined.strip():
        return True  # No experience/desc → keep job (avoid over-filtering)
    for level in EXPERIENCE_LEVELS:
        if level["id"] == exp_filter:
            return any(kw.lower() in combined for kw in level["keywords"])
    return True


async def _fetch_indianapi(keywords: list, location: str = "", page: int = 1) -> list[dict]:
    """Fetch from IndianAPI Jobs (India-focused)."""
    api_key = os.getenv("INDIANAPI_KEY")
    if not api_key:
        return []

    q = " ".join(keywords[:5]) if keywords else "software"
    url = "https://jobs.indianapi.in/jobs"
    params = {"title": q, "limit": "50"}  # API expects string for limit
    if location:
        params["location"] = location

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, params=params, headers={"X-Api-Key": api_key})
            if r.status_code != 200:
                return []
            data = r.json()
            results = []
            items = data if isinstance(data, list) else data.get("jobs", data.get("data", []))
            for item in items:
                results.append({
                    "external_id": f"indianapi_{item.get('id', '')}",
                    "title": item.get("title") or item.get("job_title", ""),
                    "company": item.get("company", ""),
                    "location": item.get("location", ""),
                    "description": item.get("job_description") or item.get("role_and_responsibility", ""),
                    "apply_url": item.get("apply_link", ""),
                    "salary": item.get("salary", "") or "",
                    "job_type": item.get("job_type", ""),
                    "source": "indianapi",
                    "posted_at": item.get("posted_date"),
                    "linkedin_url": "",
                    "company_url": "",
                })
            return results
    except Exception:
        return []


async def _fetch_jsearch(keywords: list, location: str = "", page: int = 1, posted: str = "") -> list[dict]:
    """Fetch from JSearch (RapidAPI) - LinkedIn, Indeed, Glassdoor, etc."""
    api_key = os.getenv("RAPIDAPI_KEY")
    host = os.getenv("RAPIDAPI_HOST", "jsearch.p.rapidapi.com")
    if not api_key:
        return []

    q = " ".join(keywords[:5]) if keywords else "software"
    if location:
        q = f"{q} in {location}"

    url = "https://jsearch.p.rapidapi.com/search"
    params = {"query": q, "num_pages": "3", "page": str(page)}
    # JSearch date_posted: today | 3days | week | month
    date_map = {"1d": "today", "3d": "3days", "7d": "week", "14d": "month", "30d": "month"}
    if posted and posted in date_map:
        params["date_posted"] = date_map[posted]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                url,
                params=params,
                headers={"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": host},
            )
            if r.status_code != 200:
                return []
            data = r.json()
            results = []
            for item in data.get("data", []):
                sal = item.get("job_salary_period") or ""
                if item.get("job_min_salary") or item.get("job_max_salary"):
                    sal = f"{item.get('job_min_salary', '')}-{item.get('job_max_salary', '')} {sal}".strip()
                results.append({
                    "external_id": f"jsearch_{item.get('job_id', '')}",
                    "title": item.get("job_title", ""),
                    "company": item.get("employer_name", ""),
                    "location": item.get("job_city") or item.get("job_country", ""),
                    "description": item.get("job_description", ""),
                    "apply_url": item.get("job_apply_link", ""),
                    "salary": sal,
                    "job_type": item.get("job_employment_type", ""),
                    "source": "jsearch",
                    "posted_at": item.get("job_posted_at_timestamp"),
                    "linkedin_url": item.get("employer_linkedin_url") or item.get("employer_linkedin", ""),
                    "company_url": item.get("employer_website", ""),
                    "experience": _jsearch_experience(item.get("job_required_experience")),
                })
            return results
    except Exception:
        return []


async def _fetch_naukri(keywords: list, location: str = "", page: int = 1) -> list[dict]:
    """Fetch from Naukri Job Market Intelligence API (RapidAPI)."""
    api_key = os.getenv("RAPIDAPI_KEY")
    host = os.getenv("NAUKRI_RAPIDAPI_HOST", "naukri-job-market-intelligence-api.rapidapi.com")
    # Endpoint path - check RapidAPI docs; common: /search, /jobs, /job-listings
    endpoint = os.getenv("NAUKRI_API_ENDPOINT", "/search").strip("/")
    if not api_key:
        return []

    q = " ".join(keywords[:5]) if keywords else "software"
    url = f"https://{host}/{endpoint}"
    params = {"query": q, "page": str(page)}
    if location:
        params["location"] = location

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                url,
                params=params,
                headers={"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": host},
            )
            if r.status_code != 200:
                logger.debug("Naukri API returned %s", r.status_code)
                return []
            data = r.json()
            results = []
            # Flexible response handling - API may return jobs in data, results, jobs, or root array
            items = []
            if isinstance(data, list):
                items = data
            else:
                items = data.get("jobs") or data.get("data") or data.get("results") or data.get("job_listings") or []
            for i, item in enumerate(items):
                if not isinstance(item, dict):
                    continue
                title = item.get("title") or item.get("job_title") or item.get("role") or ""
                company = item.get("company") or item.get("company_name") or item.get("employer") or ""
                job_id = item.get("id") or item.get("job_id") or item.get("external_id") or f"naukri_{page}_{i}"
                apply_url = item.get("apply_url") or item.get("url") or item.get("link") or item.get("apply_link") or ""
                results.append({
                    "external_id": f"naukri_{job_id}",
                    "title": title,
                    "company": company,
                    "location": item.get("location") or item.get("city") or item.get("job_location") or "",
                    "description": item.get("description") or item.get("job_description") or item.get("role_description") or "",
                    "apply_url": apply_url,
                    "salary": item.get("salary") or item.get("salary_range") or "",
                    "job_type": item.get("job_type") or item.get("employment_type") or "",
                    "source": "naukri",
                    "posted_at": item.get("posted_at") or item.get("posted_date") or item.get("created_at"),
                    "linkedin_url": "",
                    "company_url": item.get("company_url") or "",
                    "experience": item.get("experience") or item.get("experience_required") or "",
                })
            return results
    except Exception as e:
        logger.debug("Naukri fetch error: %s", e)
        return []


async def _fetch_adzuna(keywords: list, location: str = "", page: int = 1) -> list[dict]:
    """Fetch from Adzuna API (free)."""
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        return []

    q = " OR ".join(keywords[:3]) if keywords else "software"  # max 3 for URL
    country = "in"  # India default
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"
    params = {"app_id": app_id, "app_key": app_key, "what": q}
    if location:
        params["where"] = location

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, params=params)
            if r.status_code != 200:
                return []
            data = r.json()
            results = []
            for item in data.get("results", []):
                sal = ""
                if item.get("salary_min") or item.get("salary_max"):
                    sal = f"{item.get('salary_min', '')}-{item.get('salary_max', '')}"
                results.append({
                    "external_id": f"adzuna_{item.get('id', '')}",
                    "title": item.get("title", ""),
                    "company": item.get("company", {}).get("display_name", ""),
                    "location": item.get("location", {}).get("display_name", ""),
                    "description": item.get("description", ""),
                    "apply_url": item.get("redirect_url", ""),
                    "salary": sal,
                    "job_type": "",
                    "source": "adzuna",
                    "posted_at": item.get("created"),
                    "linkedin_url": "",
                    "company_url": "",
                    "experience": "",
                })
            return results
    except Exception:
        return []


async def _fetch_mock_jobs(keywords: list, location: str = "", page: int = 1) -> list[dict]:
    """Mock jobs when no API keys - for development."""
    all_jobs = [
        {"title": "Senior Software Engineer", "company": "TechCorp", "location": "Bengaluru"},
        {"title": "Data Scientist", "company": "DataLabs", "location": "Mumbai"},
        {"title": "Frontend Developer", "company": "StartupXYZ", "location": "Remote"},
        {"title": "ML Engineer", "company": "AI Innovations", "location": "Hyderabad"},
        {"title": "Backend Developer", "company": "CloudNine", "location": "Delhi NCR"},
        {"title": "DevOps Engineer", "company": "ScaleUp", "location": "Pune"},
        {"title": "Full Stack Developer", "company": "WebTech", "location": "Chennai"},
        {"title": "Data Engineer", "company": "DataFlow", "location": "Bangalore"},
        {"title": "Product Manager", "company": "ProductCo", "location": "Remote"},
        {"title": "QA Engineer", "company": "TestLabs", "location": "Gurgaon"},
    ]
    per_page = 5
    start = (page - 1) * per_page
    page_jobs = all_jobs[start : start + per_page]
    results = []
    for i, job in enumerate(page_jobs):
        results.append({
            "external_id": f"mock_{page}_{i}_{int(time.time())}",
            "title": job["title"],
            "company": job["company"],
            "location": job["location"],
            "description": "Requirements: 3+ years experience. Python, SQL, Machine Learning. Apply now for this exciting opportunity.",
            "apply_url": "",  # Demo jobs – no real link; add API keys for real listings
            "salary": "",
            "job_type": "Full-time",
            "source": "mock",
            "posted_at": datetime.utcnow().isoformat(),
            "linkedin_url": "",
            "company_url": "",
            "experience": "3+ years",
            "requirements": ["3+ years experience", "Python, SQL", "Machine Learning"],
        })
    return results


async def search_jobs(
    profiles: Optional[list[str]] = None,
    q: Optional[str] = None,
    location: Optional[str] = None,
    posted: Optional[str] = None,
    job_type: Optional[str] = None,
    experience: Optional[str] = None,
    min_salary: Optional[str] = None,
    page: int = 1,
) -> list[dict]:
    """
    Search jobs from all sources. Merges and deduplicates.
    Returns (jobs, using_mock) - using_mock is True when fallback to demo data (no API results).
    """
    cache_key = _get_cache_key(profiles or [], q or "", location or "", posted or "", job_type or "", experience or "", min_salary or "", page)
    cache_ts = time.time()
    if cache_key in _job_cache:
        cached_results, cached_meta = _job_cache[cache_key]
        ts = cached_meta["ts"] if isinstance(cached_meta, dict) else cached_meta
        # Handle both float (time.time) and datetime stored in older cache entries
        ts_float = ts.timestamp() if hasattr(ts, "timestamp") else ts
        if cache_ts - ts_float < CACHE_TTL_SECONDS:
            using_mock = cached_meta.get("using_mock", False) if isinstance(cached_meta, dict) else False
            return cached_results, using_mock
        del _job_cache[cache_key]

    keywords = _resolve_keywords(profiles or [])
    if q:
        keywords.append(q)

    # Fetch from sources (resilient - one fail = others work)
    all_jobs = []

    indianapi_jobs = await _fetch_indianapi(keywords, location or "", page)
    all_jobs.extend(indianapi_jobs)

    naukri_jobs = await _fetch_naukri(keywords, location or "", page)
    all_jobs.extend(naukri_jobs)

    jsearch_jobs = await _fetch_jsearch(keywords, location or "", page, posted or "")
    all_jobs.extend(jsearch_jobs)

    adzuna_jobs = await _fetch_adzuna(keywords, location or "", page)
    all_jobs.extend(adzuna_jobs)

    using_mock = False
    if not all_jobs:
        logger.info("No jobs from APIs. Add INDIANAPI_KEY, RAPIDAPI_KEY, or ADZUNA_* keys in .env for real listings.")

    # Filter by posted date for sources that don't support API-level filtering (Adzuna, IndianAPI)
    if posted and posted in ("1d", "3d", "7d", "14d", "30d"):
        now_dt = datetime.utcnow()
        days_map = {"1d": 1, "3d": 3, "7d": 7, "14d": 14, "30d": 30}
        cutoff_days = days_map.get(posted, 30)
        cutoff = now_dt - timedelta(days=cutoff_days)
        filtered = []
        for j in all_jobs:
            pt = j.get("posted_at")
            if not pt:
                filtered.append(j)  # Keep if no date (better to show than hide)
                continue
            try:
                if isinstance(pt, (int, float)):
                    dt = datetime.utcfromtimestamp(pt if pt > 1e10 else pt / 1000)
                else:
                    s = str(pt).replace("Z", "+00:00")
                    dt = datetime.fromisoformat(s)
                # Normalize to naive UTC for comparison
                if dt.tzinfo:
                    dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                if dt >= cutoff:
                    filtered.append(j)
            except Exception:
                filtered.append(j)
        all_jobs = filtered

    # Filter by job_type and experience (client-side - APIs don't all support these)
    if job_type or experience:
        filtered = []
        for j in all_jobs:
            if not _matches_job_type(j, job_type or ""):
                continue
            if not _matches_experience(j, experience or ""):
                continue
            filtered.append(j)
        all_jobs = filtered

    # Deduplicate and enrich with extracted experience/requirements
    seen = set()
    unique = []
    for j in all_jobs:
        eid = j.get("external_id", "")
        if eid and eid not in seen:
            seen.add(eid)
            desc = j.get("description", "") or ""
            exp_ext, reqs = _extract_from_description(desc)
            if not j.get("experience") and exp_ext:
                j["experience"] = exp_ext
            if not j.get("requirements"):
                j["requirements"] = reqs
            unique.append(j)

    _job_cache[cache_key] = (unique, {"ts": cache_ts, "using_mock": using_mock})
    for j in unique:
        eid = j.get("external_id")
        if eid:
            _job_detail_cache[eid] = (j.copy(), cache_ts)
    return unique, using_mock


def get_job_detail(external_id: str) -> Optional[dict]:
    """Get job by external_id from recent cache. Returns None if not found or expired."""
    if not external_id:
        return None
    entry = _job_detail_cache.get(external_id)
    if not entry:
        return None
    job, ts = entry
    if time.time() - ts > CACHE_TTL_SECONDS:
        del _job_detail_cache[external_id]
        return None
    return job
