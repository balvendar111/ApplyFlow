import { useState, useEffect } from "react";
import { X, Copy, Check, Loader2 } from "lucide-react";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";

export default function CoverLetterModal({ job, onClose }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!job) return;
    setLoading(true);
    fetchWithAuth(`${API_BASE}/jobs/cover-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: job.title,
        company: job.company || "",
        description: job.description || "",
        applicant_name: "",
      }),
    })
      .then(safeJson)
      .then((data) => setContent(data.cover_letter || ""))
      .catch(() => setContent("Could not generate cover letter."))
      .finally(() => setLoading(false));
  }, [job]);

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] shadow-xl animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label="Cover letter"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="font-heading text-lg text-[var(--primary)]">
            Cover letter — {job.title} at {job.company}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-[var(--secondary)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-body text-sm text-[var(--primary)]">
              {content}
            </pre>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-stone-200 dark:border-stone-700">
          <button
            onClick={copy}
            disabled={loading || !content}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-[var(--primary)] text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
