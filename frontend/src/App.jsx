import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Briefcase } from "lucide-react";
import ProfileFilter from "./components/ProfileFilter";
import Filters from "./components/Filters";
import JobCard from "./components/JobCard";
import JobCardSkeleton from "./components/JobCardSkeleton";
import ThemeToggle from "./components/ThemeToggle";
import ResumeUpload from "./components/ResumeUpload";
import HeaderProfile from "./components/HeaderProfile";
import AppliedJobs from "./components/AppliedJobs";
import SavedJobs from "./components/SavedJobs";
import Toast from "./components/Toast";
import { useAuth } from "./contexts/AuthContext";
import "./index.css";
import { API_BASE, safeJson, fetchWithAuth } from "./lib/api";

function sortJobs(jobs, sortBy) {
  if (!sortBy || sortBy === "newest") {
    return [...jobs].sort((a, b) => {
      const ta = a.posted_at ? (typeof a.posted_at === "number" ? a.posted_at : new Date(a.posted_at).getTime() / 1000) : 0;
      const tb = b.posted_at ? (typeof b.posted_at === "number" ? b.posted_at : new Date(b.posted_at).getTime() / 1000) : 0;
      return tb - ta;
    });
  }
  if (sortBy === "oldest") {
    return [...jobs].sort((a, b) => {
      const ta = a.posted_at ? (typeof a.posted_at === "number" ? a.posted_at : new Date(a.posted_at).getTime() / 1000) : 0;
      const tb = b.posted_at ? (typeof b.posted_at === "number" ? b.posted_at : new Date(b.posted_at).getTime() / 1000) : 0;
      return ta - tb;
    });
  }
  if (sortBy === "company") {
    return [...jobs].sort((a, b) => (a.company || "").localeCompare(b.company || ""));
  }
  return jobs;
}

// Check if backend is reachable
async function checkBackend() {
  try {
    const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

function App() {
  const { logout, user: authUser } = useAuth();
  const [backendOk, setBackendOk] = useState(null);
  useEffect(() => {
    checkBackend().then(setBackendOk);
  }, []);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const [profiles, setProfiles] = useState([]);
  const [profileList, setProfileList] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ location: "", posted: "", jobType: "", experience: "" });
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [resume, setResume] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("search"); // search | applied | saved
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const searchInputRef = useRef(null);
  const uploadSectionRef = useRef(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !e.target.matches("input, textarea, select"))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/jobs/profiles`)
      .then(safeJson)
      .then((data) => setProfileList(data.profiles || []))
      .catch(() => setProfileList([]));
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/resume`)
      .then(safeJson)
      .then((data) => setResume(data.resume))
      .catch(() => setResume(null));
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/jobs/saved`)
      .then(safeJson)
      .then((data) => setSavedIds(new Set((data.jobs || []).map((j) => j.external_id))))
      .catch(() => setSavedIds(new Set()));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [profiles, debouncedQuery, filters]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (profiles.length) params.set("profiles", profiles.join(","));
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (filters.location) params.set("location", filters.location);
    if (filters.posted) params.set("posted", filters.posted);
    if (filters.jobType) params.set("job_type", filters.jobType);
    if (filters.experience) params.set("experience", filters.experience);
    params.set("page", String(page));

    fetchWithAuth(`${API_BASE}/jobs/search?${params}`)
      .then(safeJson)
      .then((data) => {
        setJobs(data.jobs || []);
        setTotalJobs(data.total ?? 0);
        setHasMore(data.has_more ?? false);
        setUsingMock(data.using_mock ?? false);
      })
      .catch(() => {
        setJobs([]);
        setTotalJobs(0);
        setHasMore(false);
        setUsingMock(false);
      })
      .finally(() => setLoading(false));
  }, [profiles, debouncedQuery, filters, page]);

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors">
      {backendOk === false && (
        <div className="bg-red-100 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800 px-4 py-2 text-center text-sm text-red-800 dark:text-red-200">
          Backend not reachable. Run: <code className="bg-red-200/50 dark:bg-red-900/50 px-1.5 py-0.5 rounded">cd backend && uvicorn app.main:app --reload --port 8000</code>
        </div>
      )}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-[var(--surface)] px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/app" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-normal text-[var(--primary)] leading-tight">
              ApplyFlow
            </h1>
            <p className="text-xs text-[var(--secondary)] -mt-0.5">
              Smart job search with AI
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <HeaderProfile resume={resume} authEmail={authUser?.email} onOpenUpload={() => uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" })} onLogout={logout} />
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h2 className="font-heading text-2xl sm:text-3xl font-normal text-[var(--primary)] mb-1">
            Find your next role
          </h2>
          <p className="text-sm text-[var(--secondary)]">
            Search across platforms. One-click apply. Track your pipeline.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-1/3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--secondary)] mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--secondary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Software Engineer, React... (Ctrl+K to focus)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] placeholder:text-stone-400 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent font-mono text-sm outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div ref={uploadSectionRef}>
              <ResumeUpload onUpload={setResume} currentResume={resume} onSuccess={(msg) => showToast(msg || "Resume uploaded!")} />
            </div>
            <ProfileFilter
              profileList={profileList}
              selected={profiles}
              onChange={setProfiles}
            />
            <Filters filters={filters} onChange={setFilters} />
          </aside>

          <section className="lg:w-2/3">
            <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("search")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === "search" ? "bg-[var(--accent)] text-white" : "bg-stone-100 dark:bg-stone-800 text-[var(--secondary)]"}`}
            >
              Search
            </button>
            <button
              onClick={() => setActiveTab("applied")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === "applied" ? "bg-[var(--accent)] text-white" : "bg-stone-100 dark:bg-stone-800 text-[var(--secondary)]"}`}
            >
              Applied
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === "saved" ? "bg-[var(--accent)] text-white" : "bg-stone-100 dark:bg-stone-800 text-[var(--secondary)]"}`}
            >
              Saved
            </button>
          </div>
          {activeTab === "applied" ? (
            <AppliedJobs onToast={showToast} />
          ) : activeTab === "saved" ? (
            <SavedJobs
              resume={resume}
              savedIds={savedIds}
              onUnsave={(id) => setSavedIds((s) => { const n = new Set(s); n.delete(id); return n; })}
              onApplied={() => showToast("Application tracked!")}
              onToast={showToast}
            />
          ) : (
          <>
          <h3 className="font-heading text-lg font-normal text-[var(--primary)] mb-3">
              Jobs
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] p-8 text-center">
                <p className="text-[var(--secondary)] font-medium mb-2">No jobs found</p>
                <p className="text-sm text-stone-500 mb-4">Try these tips:</p>
                <ul className="text-sm text-stone-500 text-left max-w-sm mx-auto space-y-1">
                  <li>• Select a job profile (Data Scientist, Frontend, etc.)</li>
                  <li>• Use "Last 24 hours" or "Latest (3 days)" for fresh jobs</li>
                  <li>• Broaden location or remove filters</li>
                  <li>• Try different search keywords</li>
                </ul>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="text-sm text-[var(--secondary)]">{totalJobs} jobs</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-stone-200 dark:border-stone-600 bg-[var(--surface)] text-[var(--primary)]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="company">Company A–Z</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {sortJobs(jobs, sortBy).map((job) => (
                    <JobCard
                      key={job.external_id}
                      job={job}
                      resume={resume}
                      saved={savedIds.has(job.external_id)}
                      onSave={() => { setSavedIds((s) => new Set([...s, job.external_id])); showToast("Saved for later"); }}
                      onUnsave={() => { setSavedIds((s) => { const n = new Set(s); n.delete(job.external_id); return n; }); showToast("Removed from saved"); }}
                      onApplied={() => showToast("Application tracked!")}
                    />
                  ))}
                </div>
                {(page > 1 || hasMore || jobs.length > 0) && (
                  <nav className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-600 text-sm font-medium text-[var(--secondary)] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    {(() => {
                      const start = Math.max(1, page - 2);
                      const pages = [start, start + 1, start + 2, start + 3, start + 4];
                      return pages.map((n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`min-w-[2.5rem] py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            page === n
                              ? "bg-[var(--accent)] text-white"
                              : "border border-stone-200 dark:border-stone-600 text-[var(--secondary)] hover:bg-stone-100 dark:hover:bg-stone-800"
                          }`}
                        >
                          {n}
                        </button>
                      ));
                    })()}
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                      className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-600 text-sm font-medium text-[var(--secondary)] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <span className="ml-2 text-sm text-[var(--secondary)]">
                      Page {page} · {totalJobs} jobs
                    </span>
                  </nav>
                )}
              </>
            )}
          </>
          )}
          </section>
        </div>
        <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 mt-8 border-t border-stone-200 dark:border-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--secondary)]">
            <span>ApplyFlow — Smart job search with AI</span>
            <span className="flex gap-3">
              <span>React · FastAPI · Claude · Tailwind</span>
            </span>
          </div>
        </footer>
      </main>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "success" })} />
    </div>
  );
}

export default App;
