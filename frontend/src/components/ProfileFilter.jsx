import { useState } from "react";

export default function ProfileFilter({ profileList, selected, onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (!profileList?.length) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--secondary)] mb-1.5">
        Job profiles
      </label>
      <div className="flex flex-wrap gap-1.5">
        {profileList.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            style={{ animationDelay: `${i * 50}ms` }}
            className={`
              px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200
              hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
              animate-fade-in
              ${
                selected.includes(p.id)
                  ? "bg-[var(--accent)] text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-[var(--primary)] hover:bg-stone-200 dark:hover:bg-stone-700"
              }
            `}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
