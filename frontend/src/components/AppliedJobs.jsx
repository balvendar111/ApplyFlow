import { useState, useEffect } from "react";
import { ExternalLink, Download, Trash2 } from "lucide-react";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";

export default function AppliedJobs({ statusFilter, onToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = () => {
    setLoading(true);
    const url = statusFilter ? `${API_BASE}/jobs/applied?status=${statusFilter}` : `${API_BASE}/jobs/applied`;
    fetchWithAuth(url)
      .then(safeJson)
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const clearAll = async () => {
    if (!window.confirm("Clear all applied jobs? This cannot be undone.")) return;
    try {
      const r = await fetchWithAuth(`${API_BASE}/jobs/applied`, { method: "DELETE" });
      const data = await safeJson(r);
      if (data.success) {
        setJobs([]);
        onToast?.("Applied jobs cleared.");
      }
    } catch {
      onToast?.("Failed to clear.", "error");
    }
  };

  const exportCsv = async () => {
    try {
      const r = await fetchWithAuth(`${API_BASE}/jobs/applied/export`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "applied_jobs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-[var(--primary)]">Applied jobs</h3>
        <div className="flex gap-2">
          {jobs.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 text-sm text-[var(--secondary)] hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--secondary)]">Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-[var(--secondary)]">No applied jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)]"
            >
              <div>
                <p className="font-medium text-[var(--primary)]">{j.title}</p>
                <p className="text-sm text-[var(--secondary)]">{j.company}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                  j.status === "interview" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                  j.status === "rejected" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                  "bg-stone-100 dark:bg-stone-800 text-[var(--secondary)]"
                }`}>
                  {j.status}
                </span>
              </div>
              {j.apply_url && !j.apply_url.includes("example.com") && (
                <a
                  href={j.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-[var(--accent)]"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
