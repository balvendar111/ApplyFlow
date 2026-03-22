import { useState, useEffect } from "react";
import { X, Loader2, Lightbulb, RefreshCw } from "lucide-react";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";

function parseTipsToLines(tips) {
  if (!tips) return [];
  return tips
    .split("\n")
    .map((line) => line.replace(/^[•\-*\d.]+\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export default function ResumeTipsModal({ job, resumeSkills = [], onClose }) {
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTips = (regenerate = false) => {
    if (!job) return;
    setLoading(true);
    setError(false);
    fetchWithAuth(`${API_BASE}/jobs/resume-tips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_description: job.description || "",
        skills: resumeSkills,
        variation: regenerate,
      }),
    })
      .then(safeJson)
      .then((data) => {
        setTips(data.tips || "");
        setError(false);
      })
      .catch(() => {
        setTips("");
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTips(false);
  }, [job?.external_id]);

  if (!job) return null;

  const lines = parseTipsToLines(tips);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] shadow-2xl dark:shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-label="Resume tips"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-medium text-[var(--primary)]">
                Resume tips
              </h3>
              <p className="text-xs text-[var(--secondary)] truncate max-w-[200px]">{job.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-[var(--secondary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[55vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
              <p className="text-sm text-[var(--secondary)]">Generating tips for this job...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">Could not load tips.</p>
              <button
                onClick={() => fetchTips(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>
          ) : lines.length > 0 ? (
            <ul className="space-y-3">
              {lines.map((line, i) => {
                const colonIdx = line.indexOf(":");
                const label = colonIdx > 0 ? line.slice(0, colonIdx + 1) : null;
                const content = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
                return (
                  <li
                    key={i}
                    className="flex gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-700/50"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      {label && (
                        <span className="font-medium text-[var(--primary)]">{label} </span>
                      )}
                      <span className="text-sm text-[var(--secondary)]">{content || line}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--secondary)] py-4">{tips || "No tips available."}</p>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-200 dark:border-stone-700">
          {!loading && !error && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fetchTips(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 text-[var(--secondary)] text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
