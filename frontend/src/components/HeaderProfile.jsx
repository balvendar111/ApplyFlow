import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Upload, LogOut, Shield } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import SkillsModal from "./SkillsModal";

/**
 * Compact profile in header (top-right, where login/signup usually is).
 * Shows candidate name + avatar when resume exists; "Add profile" when not.
 * Click opens dropdown with full profile. Admin-only: User Activity link.
 */
const SKILLS_PREVIEW = 6;

export default function HeaderProfile({ resume, authEmail, isAdmin, onOpenUpload, onLogout }) {
  const [open, setOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  useEffect(() => {
    if (!open) setShowSkills(false);
  }, [open]);

  const displayName = resume?.name || (authEmail ? authEmail.split("@")[0] : null);
  const initials = resume?.name
    ? resume.name
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
    : authEmail
      ? authEmail.slice(0, 2).toUpperCase()
      : "?";

  return (
    <div className="relative" ref={ref}>
      {showSkills && resume?.skills?.length > 0 && (
        <SkillsModal skills={resume.skills} title="My Skills" onClose={() => setShowSkills(false)} />
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors
          ${(resume || authEmail)
            ? "border-stone-200 dark:border-stone-700 bg-[var(--surface)] hover:bg-stone-100 dark:hover:bg-stone-800"
            : "border-dashed border-stone-300 dark:border-stone-600 hover:border-[var(--accent)] hover:bg-orange-50/50 dark:hover:bg-orange-950/20"}
        `}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
            ${(resume || authEmail) ? "bg-[var(--accent)] text-white" : "bg-stone-200 dark:bg-stone-700 text-stone-500"}
          `}
        >
          {(resume || authEmail) ? initials : <Upload className="w-3.5 h-3.5" />}
        </div>
        <span className="text-sm font-medium text-[var(--primary)] max-w-[120px] truncate">
          {displayName || authEmail || "Add profile"}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--secondary)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] shadow-xl z-50 overflow-hidden">
          {(resume || authEmail) ? (
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-200 dark:border-stone-700">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-[var(--primary)]">{resume?.name || displayName}</p>
                  {(resume?.email || authEmail) && (
                    <a href={`mailto:${resume?.email || authEmail}`} className="text-xs text-[var(--secondary)] hover:text-[var(--accent)] truncate block">
                      {resume?.email || authEmail}
                    </a>
                  )}
                </div>
              </div>
              {resume?.phone && (
                <a href={`tel:${resume.phone}`} className="text-sm text-[var(--secondary)] hover:text-[var(--accent)] block">
                  {resume.phone}
                </a>
              )}
              {resume?.experience?.trim() && (
                <div>
                  <p className="text-xs font-medium text-[var(--secondary)] mb-1">Experience</p>
                  <p className="text-sm text-[var(--primary)] leading-relaxed">{resume.experience}</p>
                </div>
              )}
              {resume?.education?.trim() && (
                <div>
                  <p className="text-xs font-medium text-[var(--secondary)] mb-1">Education</p>
                  <p className="text-sm text-[var(--primary)] leading-relaxed">{resume.education}</p>
                </div>
              )}
              {(resume?.skills?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--secondary)] mb-1.5">Skills</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowSkills(true); }}
                    title="Click to view all skills"
                    className="flex flex-wrap gap-1 text-left w-full rounded-lg p-1.5 -m-1.5 hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors group cursor-pointer"
                  >
                    {resume.skills.slice(0, SKILLS_PREVIEW).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-xs text-[var(--primary)] group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40">
                        {s}
                      </span>
                    ))}
                    {resume.skills.length > SKILLS_PREVIEW && (
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-xs text-[var(--accent)] font-medium group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40">
                        +{resume.skills.length - SKILLS_PREVIEW} more
                      </span>
                    )}
                  </button>
                </div>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); setShowAdmin(true); }}
                  className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700 w-full flex items-center justify-center gap-2 text-sm text-[var(--accent)] hover:underline"
                >
                  <Shield className="w-4 h-4" />
                  User Activity (Admin)
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onLogout(); }}
                  className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 w-full flex items-center justify-center gap-2 text-sm text-[var(--secondary)] hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <User className="w-10 h-10 mx-auto text-stone-400 mb-2" />
              <p className="text-sm text-[var(--secondary)] mb-2">Upload your resume to add your profile</p>
              <button
                onClick={() => { setOpen(false); onOpenUpload?.(); }}
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Upload resume →
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onLogout(); }}
                  className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--secondary)] hover:text-red-600 mx-auto"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
