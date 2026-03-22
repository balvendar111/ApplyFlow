import { useState } from "react";
import { X, Code2, Copy, Check } from "lucide-react";

/**
 * Modal to view all skills in a polished, professional layout.
 * Opens when user clicks on skills anywhere in the app.
 */
export default function SkillsModal({ skills = [], title = "Skills", onClose }) {
  const [copied, setCopied] = useState(false);
  const list = Array.isArray(skills) ? skills : [];

  const copyAll = () => {
    if (list.length === 0) return;
    navigator.clipboard.writeText(list.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700 bg-gradient-to-r from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-[var(--primary)]">{title}</h3>
              <p className="text-xs text-[var(--secondary)]">{list.length} skill{list.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {list.length > 0 && (
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[var(--primary)] transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--secondary)] hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-[var(--primary)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {list.length === 0 ? (
            <p className="text-center text-[var(--secondary)] py-8">No skills added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {list.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[var(--primary)] text-sm font-medium border border-stone-200/50 dark:border-stone-700/50 hover:border-[var(--accent)]/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 hover:shadow-sm transition-all"
                >
                  {String(skill).trim() || "—"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
