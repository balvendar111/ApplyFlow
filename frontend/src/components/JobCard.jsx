import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, Lightbulb, Target, Bookmark, BookmarkCheck, Linkedin, Globe, ChevronDown, ChevronUp } from "lucide-react";
import CoverLetterModal from "./CoverLetterModal";
import ResumeTipsModal from "./ResumeTipsModal";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";

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

export default function JobCard({ job, resume, onApplied, saved, onSave, onUnsave }) {
  const [matchScore, setMatchScore] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const openApply = () => {
    const hasRealLink = job.apply_url && !job.apply_url.includes("example.com");
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
    }).then(() => onApplied?.());
  };

  const toggleSave = () => {
    if (saved) {
      fetchWithAuth(`${API_BASE}/jobs/save?external_id=${encodeURIComponent(job.external_id)}`, { method: "DELETE" }).then(() => onUnsave?.());
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
      }).then(() => onSave?.());
    }
  };

  const fetchMatchScore = () => {
    if (matchScore !== null || loadingScore) return;
    setLoadingScore(true);
    fetchWithAuth(`${API_BASE}/jobs/match-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_description: job.description || "" }),
    })
      .then(safeJson)
      .then((data) => setMatchScore(data.score))
      .catch(() => setMatchScore(null))
      .finally(() => setLoadingScore(false));
  };

  const fetchSummary = () => {
    if (summary || loadingSummary) return;
    setLoadingSummary(true);
    fetchWithAuth(`${API_BASE}/jobs/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: job.description || "" }),
    })
      .then(safeJson)
      .then((data) => setSummary(data.summary))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  };

  const scoreColor = (s) => {
    if (!s) return "";
    if (s >= 7) return "text-green-600 dark:text-green-400 border-green-500";
    if (s >= 4) return "text-amber-600 dark:text-amber-400 border-amber-500";
    return "text-red-600 dark:text-red-400 border-red-500";
  };

  const [showRequirements, setShowRequirements] = useState(false);
  const requirements = job.requirements || [];

  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <article
        className="group rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] px-3 py-2.5 hover:border-stone-300 dark:hover:border-stone-600 transition-all"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/app/job/${encodeURIComponent(job.external_id)}`}
                className="font-medium text-sm text-[var(--primary)] truncate hover:text-[var(--accent)] hover:underline"
              >
                {job.title}
              </Link>
              <span className="text-stone-400 dark:text-stone-500 text-xs">·</span>
              <span className="text-xs text-[var(--secondary)] truncate">
                {job.company}{job.location && ` · ${job.location}`}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {job.experience && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    {job.experience}
                  </span>
                )}
                {job.salary && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {job.salary}
                  </span>
                )}
                {formatPosted(job.posted_at) && (
                  <span className="text-[10px] text-stone-500">{formatPosted(job.posted_at)}</span>
                )}
                <span className="text-[10px] text-stone-500 uppercase">{job.source === "mock" ? "Demo" : job.source}</span>
                {resume && (
                  <button
                    onClick={fetchMatchScore}
                    disabled={loadingScore}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${scoreColor(matchScore)}`}
                  >
                    {loadingScore ? "…" : matchScore !== null ? `${matchScore}/10` : "Match"}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {(job.linkedin_url || job.company_url) && (
              <>
                {job.linkedin_url && (
                  <a href={job.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-stone-500 hover:text-[var(--accent)]" title="LinkedIn">
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                )}
                {job.company_url && (
                  <a href={job.company_url.startsWith("http") ? job.company_url : `https://${job.company_url}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-stone-500 hover:text-[var(--accent)]" title="Company">
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            )}
            <button onClick={toggleSave} className="p-1.5 rounded text-stone-500 hover:text-[var(--accent)]" title={saved ? "Unsave" : "Save"}>
              {saved ? <BookmarkCheck className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowCoverLetter(true)} className="p-1.5 rounded text-stone-500 hover:text-[var(--accent)]" title="Cover letter"><FileText className="w-4 h-4" /></button>
            <button onClick={() => setShowTips(true)} className="p-1.5 rounded text-stone-500 hover:text-[var(--accent)]" title="Tips"><Lightbulb className="w-4 h-4" /></button>
            <button onClick={openApply} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90">
              Apply <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
        {(summary || loadingSummary || expanded) && (
          <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {loadingSummary && <p className="text-xs text-stone-500">Loading summary…</p>}
            {summary && <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">{summary}</p>}
            {!summary && !loadingSummary && job.description && (
              <button onClick={fetchSummary} className="text-xs text-[var(--accent)] hover:underline">Summarize</button>
            )}
            {requirements.length > 0 && (
              <button onClick={() => setShowRequirements(!showRequirements)} className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                {showRequirements ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Requirements ({requirements.length})
              </button>
            )}
            {showRequirements && requirements.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-stone-600 dark:text-stone-400 list-disc list-inside">
                {requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        )}
        {!summary && !loadingSummary && (job.description || requirements.length > 0) && (
          <button onClick={() => setExpanded(!expanded)} className="mt-1.5 text-xs text-[var(--accent)] hover:underline">
            {expanded ? "Hide" : "Show details"}
          </button>
        )}
      </article>

      {showCoverLetter && (
        <CoverLetterModal job={job} onClose={() => setShowCoverLetter(false)} />
      )}
      {showTips && (
        <ResumeTipsModal
          job={job}
          resumeSkills={resume?.skills || []}
          onClose={() => setShowTips(false)}
        />
      )}
    </>
  );
}
