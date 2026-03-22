# ApplyFlow

**Smart job search** — Multi-platform search, AI-powered resume parsing (Claude), cover letters, match score, application tracking. Built for India & international markets.

![Tech: React · FastAPI · Claude · Tailwind · SQLite](https://img.shields.io/badge/Stack-React%20%C2%B7%20FastAPI%20%C2%B7%20Claude%20%C2%B7%20Tailwind-blue?style=flat-square)

## Demo

**[▶️ Watch Demo Video on LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7441485080226590720/)** — Full walkthrough of job search, resume upload, AI cover letters, and application tracking.

## Features

- **Job Search** — 15 profiles (Data Scientist, Frontend, Backend, ML, etc.), filters: location, posted date (24h, 3d, 7d), experience
- **Job Detail Page** — Click any job title for full view, cover letter, tips, apply
- **Resume Upload** — PDF/DOCX, Claude extracts name, email, skills, experience
- **Match Score** — AI rates resume vs job (1–10)
- **Cover Letter** — Claude generates custom draft
- **Resume Tips** — AI suggests skills to highlight
- **Save for Later** — Bookmark jobs, view in Saved tab
- **Application Tracking** — Applied / Interview / Rejected, CSV export
- **Dark Mode** — Theme toggle
- **Sort & Pagination** — Newest, Company A–Z, multiple pages
- **Password Reset** — Forgot password flow via email (configurable SMTP)
- **Rate Limiting** — Protects auth and AI endpoints from abuse

## Tech Stack

| Layer     | Stack                    |
| --------- | ------------------------ |
| Frontend  | React, Vite, Tailwind    |
| Backend   | FastAPI, SQLite          |
| AI        | Anthropic Claude, Ollama (fallback) |
| Job APIs  | JSearch, Adzuna, IndianAPI |

## Quick Start (Development)

```bash
# 1. Create venv and install backend deps (one-time)
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# 2. Backend
cd backend && uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** • API at **http://127.0.0.1:8000**

## Production Deployment

### Deploy free on Render (recommended)

See **[DEPLOY.md](DEPLOY.md)** for the full guide. Push to GitHub, connect to [Render](https://render.com), and deploy with one click. Includes PostgreSQL, Docker build, and env var setup.

### Option 1: Single server (build + serve)

```bash
cd frontend && npm run build
cd ../backend
export SERVE_FRONTEND=true
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

App served at **http://localhost:8000**

### Option 2: Docker

```bash
docker build -t applyflow .
docker run -p 8000:8000 --env-file .env applyflow
```

### Option 3: Split (Frontend + Backend)

- **Frontend** → Vercel / Netlify (set `VITE_API_BASE=https://your-api.com`)
- **Backend** → Railway / Render / Fly.io  
  Set `CORS_ORIGINS=https://your-frontend.vercel.app` in env

## LLM (Anthropic + Ollama)

AI features (resume parsing, cover letter, match score, tips, chat) use **Anthropic first when `ANTHROPIC_API_KEY` is set**, then **Ollama as fallback** when the key is missing or Anthropic fails. This way you always have a working AI if Ollama is running locally.

**Ollama setup (optional fallback):**

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3.2
# Ollama runs on localhost:11434 by default
```

Env vars: `OLLAMA_BASE_URL` (default `http://localhost:11434/v1`), `OLLAMA_MODEL` (default `llama3.2`).

## Environment Variables

| Variable          | Description                          |
| ----------------- | ------------------------------------ |
| `ANTHROPIC_API_KEY` | Claude API (optional; Ollama used when unset or on failure) |
| `OLLAMA_BASE_URL` | Ollama API URL (default `http://localhost:11434/v1`) |
| `OLLAMA_MODEL`   | Ollama model name (default `llama3.2`) |
| `ADZUNA_APP_ID`   | Free job API                         |
| `RAPIDAPI_KEY`    | JSearch (LinkedIn, Indeed jobs)       |
| `INDIANAPI_KEY`   | India-focused jobs                   |
| `CORS_ORIGINS`    | Production: your frontend URL(s)      |
| `SERVE_FRONTEND`  | `true` to serve built frontend       |
| `RESET_PASSWORD_BASE_URL` | Frontend URL for reset links (e.g. `https://app.example.com`) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | For password reset emails (optional; if unset, reset link is logged for dev) |

## API Keys (Optional)

Without keys, mock jobs are shown. Get free tiers:

- **Adzuna**: [developer.adzuna.com](https://developer.adzuna.com)
- **RapidAPI JSearch**: [rapidapi.com](https://rapidapi.com)
- **IndianAPI**: [indianapi.in](https://indianapi.in)

---

## LinkedIn Post Template

Copy-paste and customize for your post:

---

**🚀 Built: ApplyFlow — Smart Job Search with AI**

A full-stack job search app that helps you find roles faster and apply smarter.

**What it does:**
• Multi-platform job search (JSearch, Adzuna, IndianAPI)
• Upload resume → Claude AI parses name, skills, experience
• Match score (1–10) for each job
• AI-generated cover letters
• Save jobs, track applications, export to CSV
• Filters: Last 24h, 3 days, location, experience

**Tech:** React · FastAPI · Claude AI · Tailwind · SQLite

[GitHub](https://github.com/balvendar111/ApplyFlow) · [Live Demo](https://applyflow.onrender.com) · [LinkedIn](https://www.linkedin.com/in/balvendra-singh-6834931a7/)

---

## Author

**Balvendra Singh**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/balvendra-singh-6834931a7/)

---

## License

MIT
