import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, FileText, Lightbulb } from "lucide-react";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";
import CoverLetterModal from "../components/CoverLetterModal";
import ResumeTipsModal from "../components/ResumeTipsModal";
import HeaderProfile from "../components/HeaderProfile";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../contexts/AuthContext";

function formatPosted(ts) {
  if (!ts) return null;
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff < 1) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${diff >= 14 ? "s" : ""} ago`;
  return d.toLocaleDateString();
}

export default function JobDetailPage() {
  const { externalId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (!externalId) return;
    setLoading(true);
    fetchWithAuth(`${API_BASE}/jobs/detail/${encodeURIComponent(externalId)}`)
      .then(safeJson)
      .then((data) => setJob(data.job))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [externalId]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/resume`)
      .then(safeJson)
      .then((data) => setResume(data.resume))
      .catch(() => setResume(null));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/jobs/saved`)
      .then(safeJson)
      .then((data) => setSavedIds(new Set((data.jobs || []).map((j) => j.external_id))))
      .catch(() => setSavedIds(new Set()));
  }, []);

  const saved = job && savedIds.has(job.external_id);

  const toggleSave = () => {
    if (!job) return;
    if (saved) {
      fetchWithAuth(`${API_BASE}/jobs/save?external_id=${encodeURIComponent(job.external_id)}`, { method: "DELETE" })
        .then(() => setSavedIds((s) => { const n = new Set(s); n.delete(job.external_id); return n; }));
    } else {
      fetchWithAuth(`${API_BASE}/jobs/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_id: job.external_id,
          title: job.title,
          company: job.company || "",
          apply_url: job.apply_url || "",
          source: job.source || "",
        }),
      }).then(() => setSavedIds((s) => new Set([...s, job.external_id])));
    }
  };

  const openApply = () => {
    const hasRealLink = job?.apply_url && !job.apply_url.includes("example.com");
    if (hasRealLink) {
      window.open(job.apply_url, "_blank");
    }
    fetchWithAuth(`${API_BASE}/jobs/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        external_id: job.external_id,
        title: job.title,
        company: job.company || "",
        apply_url: job.apply_url || "",
      }),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--secondary)]">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        <header className="border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center justify-between">
          <Link to="/app" className="font-heading text-xl text-[var(--primary)]">ApplyFlow</Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="font-heading text-2xl text-[var(--primary)] mb-2">Job not found</h2>
          <p className="text-[var(--secondary)] mb-4">This job may have expired. Search again to find similar roles.</p>
          <Link to="/app" className="text-[var(--accent)] hover:underline">← Back to search</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-[var(--surface)] px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/app" className="flex items-center gap-2 text-[var(--secondary)] hover:text-[var(--primary)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to search
        </Link>
        <div className="flex items-center gap-2">
          <HeaderProfile resume={resume} authEmail={authUser?.email} isAdmin={authUser?.isAdmin} onOpenUpload={() => navigate("/app")} onLogout={logout} />
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <article className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl text-[var(--primary)] mb-1">
                {job.title}
              </h1>
              <p className="text-lg text-[var(--secondary)]">
                {job.company}{job.location && ` · ${job.location}`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {job.experience && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    {job.experience}
                  </span>
                )}
                {job.salary && (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {job.salary}
                  </span>
                )}
                {job.job_type && (
                  <span className="text-xs px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-[var(--secondary)]">
                    {job.job_type}
                  </span>
                )}
                {formatPosted(job.posted_at) && (
                  <span className="text-xs text-[var(--secondary)]">{formatPosted(job.posted_at)}</span>
                )}
                <span className="text-xs text-[var(--secondary)] uppercase">{job.source === "mock" ? "Demo" : job.source}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleSave}
                className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-[var(--secondary)]"
                title={saved ? "Unsave" : "Save"}
              >
                {saved ? <BookmarkCheck className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" /> : <Bookmark className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowCoverLetter(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm"
              >
                <FileText className="w-4 h-4" />
                Cover letter
              </button>
              <button
                onClick={() => setShowTips(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm"
              >
                <Lightbulb className="w-4 h-4" />
                Tips
              </button>
              <button
                onClick={openApply}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90"
              >
                Apply <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--secondary)] mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--primary)]">
                {job.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-[var(--secondary)] mb-2">Description</h3>
            <div className="prose prose-stone dark:prose-invert max-w-none text-sm text-[var(--primary)] whitespace-pre-wrap">
              {job.description || "No description available."}
            </div>
          </div>
        </article>
      </main>

      {showCoverLetter && (
        <CoverLetterModal job={job} onClose={() => setShowCoverLetter(false)} />
      )}
      {showTips && (
        <ResumeTipsModal job={job} resumeSkills={resume?.skills || []} onClose={() => setShowTips(false)} />
      )}
    </div>
  );
}
