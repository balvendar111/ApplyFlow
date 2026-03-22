import { useState, useEffect } from "react";
import { ExternalLink, BookmarkCheck, Trash2 } from "lucide-react";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";
import JobCard from "./JobCard";

export default function SavedJobs({ resume, savedIds, onUnsave, onApplied, onToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetchWithAuth(`${API_BASE}/jobs/saved`)
      .then(safeJson)
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUnsave = (external_id) => {
    fetchWithAuth(`${API_BASE}/jobs/save?external_id=${encodeURIComponent(external_id)}`, { method: "DELETE" })
      .then(() => {
        onUnsave?.(external_id);
        refresh();
        onToast?.("Removed from saved");
      });
  };

  const clearAll = async () => {
    if (!window.confirm("Clear all saved jobs? This cannot be undone.")) return;
    try {
      const r = await fetchWithAuth(`${API_BASE}/jobs/saved`, { method: "DELETE" });
      const data = await safeJson(r);
      if (data.success) {
        jobs.forEach((j) => onUnsave?.(j.external_id));
        setJobs([]);
        onToast?.("Saved jobs cleared.");
      }
    } catch {
      onToast?.("Failed to clear.", "error");
    }
  };

  if (loading) return <p className="text-sm text-[var(--secondary)]">Loading...</p>;
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] p-8 text-center">
        <BookmarkCheck className="w-12 h-12 mx-auto text-stone-400 mb-3" />
        <p className="text-[var(--secondary)] font-medium mb-1">No saved jobs</p>
        <p className="text-sm text-stone-500">Save jobs from search to view them here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-lg text-[var(--primary)]">Saved jobs ({jobs.length})</h3>
        <button
          onClick={clearAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="w-4 h-4" />
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {jobs.map((j) => (
          <JobCard
            key={j.external_id}
            job={{ ...j, location: j.location || "" }}
            resume={resume}
            saved={true}
            onSave={() => {}}
            onUnsave={() => handleUnsave(j.external_id)}
            onApplied={onApplied}
          />
        ))}
      </div>
    </div>
  );
}
