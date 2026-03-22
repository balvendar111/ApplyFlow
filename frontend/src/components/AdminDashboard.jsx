import { useState, useEffect, useMemo } from "react";
import { X, Users, FileText, Briefcase, Bookmark, Search, Loader2, Shield, Eye, Copy, Check } from "lucide-react";
import SkillsModal from "./SkillsModal";
import { API_BASE, fetchWithAuth, safeJson } from "../lib/api";

/** Format phone: remove extra spaces, normalize Indian format. */
function formatPhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  const cleaned = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/^\+/, "");
  if (!digits || digits.length < 10) return null;
  if (digits.startsWith("91") && digits.length === 12) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.startsWith("1") && digits.length === 11) return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}

/** User detail modal - full info, copyable. */
function UserDetailModal({ user, onClose }) {
  const [copied, setCopied] = useState(null);
  const [showSkills, setShowSkills] = useState(false);
  const email = user.resume_email || user.email;
  const phone = formatPhone(user.phone) || user.phone;

  const copy = (label, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const skills = Array.isArray(user.skills) ? user.skills : [];
  const formatDate = (s) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      {showSkills && <SkillsModal skills={skills} title="Skills" onClose={() => setShowSkills(false)} />}
      <div className="w-full max-w-md bg-[var(--surface)] rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 p-5 space-y-4 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h4 className="font-heading text-lg font-semibold text-[var(--primary)]">User details</h4>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-[var(--secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <DetailRow label="Name" value={user.name || "—"} onCopy={user.name ? () => copy("name", user.name) : null} copied={copied === "name"} />
          <DetailRow label="Email" value={email} onCopy={() => copy("email", email)} copied={copied === "email"} href={email ? `mailto:${email}` : null} />
          <DetailRow label="Contact" value={phone} onCopy={() => copy("phone", phone)} copied={copied === "phone"} href={phone ? `tel:${phone.replace(/\s/g, "")}` : null} />
          <DetailRow label="Joined" value={formatDate(user.created_at)} />
          <div>
            <p className="text-[var(--secondary)] text-xs mb-1.5">Skills</p>
            {skills.length ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowSkills(true); }}
                className="flex flex-wrap gap-1.5 text-left w-full rounded-lg p-2 -m-2 hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors group cursor-pointer"
              >
                {skills.slice(0, 4).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[var(--primary)] text-xs group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40">
                    {s}
                  </span>
                ))}
                {skills.length > 4 && <span className="text-xs text-[var(--accent)] font-medium">+{skills.length - 4} more</span>}
              </button>
            ) : (
              <p className="text-[var(--secondary)]">—</p>
            )}
          </div>
          <div className="flex gap-4 pt-2 border-t border-stone-200 dark:border-stone-700">
            <StatBadge icon={<FileText className="w-4 h-4" />} label="Resumes" value={user.resumes ?? 0} />
            <StatBadge icon={<Briefcase className="w-4 h-4" />} label="Applied" value={user.applied ?? 0} />
            <StatBadge icon={<Bookmark className="w-4 h-4" />} label="Saved" value={user.saved ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, onCopy, copied, href }) {
  if (value == null || value === "") return null;
  const content = href ? <a href={href} className="text-[var(--accent)] hover:underline break-all">{value}</a> : <span className="break-words">{value}</span>;
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[var(--secondary)] text-xs">{label}</p>
        {content}
      </div>
      {onCopy && (
        <button onClick={onCopy} className="shrink-0 p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800" title="Copy">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-[var(--secondary)]" />}
        </button>
      )}
    </div>
  );
}

function StatBadge({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[var(--secondary)]">{label}:</span>
      <span className="font-semibold text-[var(--primary)]">{value}</span>
    </div>
  );
}

/**
 * Admin-only dashboard: users with name, contact, email, skills, activity stats.
 */
export default function AdminDashboard({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState(null);
  const [skillsModal, setSkillsModal] = useState(null);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/admin/users`)
      .then(safeJson)
      .then((data) => {
        if (data.users) setUsers(data.users);
        else setError("Failed to load");
      })
      .catch(() => setError("Access denied or network error"))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalResumes = users.reduce((s, u) => s + (u.resumes ?? 0), 0);
    const totalApplied = users.reduce((s, u) => s + (u.applied ?? 0), 0);
    const totalSaved = users.reduce((s, u) => s + (u.saved ?? 0), 0);
    return { totalResumes, totalApplied, totalSaved };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const resumeEmail = (u.resume_email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const skillsStr = Array.isArray(u.skills) ? u.skills.join(" ").toLowerCase() : "";
      return name.includes(q) || email.includes(q) || resumeEmail.includes(q) || phone.includes(q) || skillsStr.includes(q);
    });
  }, [users, search]);

  const formatDate = (s) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {skillsModal && <SkillsModal skills={skillsModal} title="Skills" onClose={() => setSkillsModal(null)} />}
      {detailUser && <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />}
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-[var(--surface)] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700 bg-gradient-to-r from-stone-50 to-stone-100/80 dark:from-stone-900/50 dark:to-stone-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-[var(--primary)]">Admin Dashboard</h3>
              <p className="text-xs text-[var(--secondary)] mt-0.5">User activity and profile overview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--secondary)] hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-[var(--primary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
              <p className="text-sm text-[var(--secondary)]">Loading users…</p>
            </div>
          )}
          {error && (
            <div className="py-12 px-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && users.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-[var(--primary)] font-medium">No users yet</p>
              <p className="text-sm text-[var(--secondary)] mt-1">User data will appear here once they sign up.</p>
            </div>
          )}
          {!loading && !error && users.length > 0 && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4">
                  <div className="flex items-center gap-2 text-[var(--secondary)] mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Total Users</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--primary)]">{users.length}</p>
                </div>
                <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4">
                  <div className="flex items-center gap-2 text-[var(--secondary)] mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-medium">Resumes</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--primary)]">{stats.totalResumes}</p>
                </div>
                <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4">
                  <div className="flex items-center gap-2 text-[var(--secondary)] mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-medium">Applications</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--primary)]">{stats.totalApplied}</p>
                </div>
                <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4">
                  <div className="flex items-center gap-2 text-[var(--secondary)] mb-1">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-xs font-medium">Saved Jobs</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--primary)]">{stats.totalSaved}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--secondary)]" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, skills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 text-[var(--primary)] placeholder:text-stone-400 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                />
              </div>

              {/* Table */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="overflow-x-auto max-h-[42vh] overflow-y-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="sticky top-0 z-10 bg-stone-100 dark:bg-stone-800/95 text-left">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] whitespace-nowrap">Name</th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] whitespace-nowrap">Contact</th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] whitespace-nowrap min-w-[200px]">Email</th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] min-w-[220px]">Skills</th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] whitespace-nowrap">Joined</th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] text-center" title="Resumes">
                          <FileText className="w-4 h-4 inline" />
                        </th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] text-center" title="Applied">
                          <Briefcase className="w-4 h-4 inline" />
                        </th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] text-center" title="Saved">
                          <Bookmark className="w-4 h-4 inline" />
                        </th>
                        <th className="px-4 py-3 font-semibold text-[var(--primary)] text-center w-12">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-[var(--secondary)]">
                            No users match “{search}”
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u, i) => (
                          <tr
                            key={u.id}
                            className={`border-t border-stone-200 dark:border-stone-700 transition-colors cursor-pointer ${
                              i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-stone-50/50 dark:bg-stone-800/20"
                            } hover:bg-orange-50/50 dark:hover:bg-orange-950/20`}
                            onClick={() => setDetailUser(u)}
                          >
                            <td className="px-4 py-3 font-medium text-[var(--primary)] whitespace-nowrap">{u.name || "—"}</td>
                            <td className="px-4 py-3 text-[var(--secondary)] whitespace-nowrap">{formatPhone(u.phone) || "—"}</td>
                            <td className="px-4 py-3 min-w-[200px]">
                              {(u.resume_email || u.email) ? (
                                <a href={`mailto:${u.resume_email || u.email}`} className="text-[var(--accent)] hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                                  {u.resume_email || u.email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                              {Array.isArray(u.skills) && u.skills.length ? (
                                <button
                                  type="button"
                                  onClick={() => setSkillsModal(u.skills)}
                                  className="flex flex-wrap gap-1 text-left w-full p-1 -m-1 rounded-lg hover:bg-orange-50/50 dark:hover:bg-orange-950/30 transition-colors group"
                                >
                                  {u.skills.slice(0, 3).map((s, j) => (
                                    <span key={j} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-[var(--primary)] text-xs group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50">
                                      {s}
                                    </span>
                                  ))}
                                  {u.skills.length > 3 && <span className="text-xs text-[var(--accent)] font-medium">+{u.skills.length - 3}</span>}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-[var(--secondary)] whitespace-nowrap">{formatDate(u.created_at)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-[var(--primary)] font-medium">
                                {u.resumes ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-[var(--primary)] font-medium">
                                {u.applied ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-[var(--primary)] font-medium">
                                {u.saved ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setDetailUser(u)}
                                className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-[var(--secondary)] hover:text-[var(--accent)] transition-colors"
                                title="View full details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 text-xs text-[var(--secondary)]">
                  Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
                  {search && ` • filtered by “${search}”`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
