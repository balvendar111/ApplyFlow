export default function Filters({ filters, onChange }) {
  const update = (key, value) => {
    onChange({ ...filters, [key]: value });
  };
  const clear = () => onChange({ location: "", posted: "", jobType: "", experience: "" });
  const hasAny = filters.location || filters.posted || filters.jobType || filters.experience;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--secondary)] mb-1.5">
          Filters
        </label>
        {hasAny && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div>
        <input
          type="text"
          placeholder="Location"
          className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] placeholder:text-stone-400 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={filters.location}
          onChange={(e) => update("location", e.target.value)}
        />
      </div>
      <div>
        <select
          className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={filters.posted}
          onChange={(e) => update("posted", e.target.value)}
        >
          <option value="">Posted (any)</option>
          <option value="1d">Last 24 hours</option>
          <option value="3d">Latest (3 days)</option>
          <option value="7d">Last 7 days</option>
          <option value="14d">Last 14 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>
      <div>
        <select
          className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={filters.jobType}
          onChange={(e) => update("jobType", e.target.value)}
        >
          <option value="">Job type (any)</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
        </select>
      </div>
      <div>
        <select
          className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={filters.experience}
          onChange={(e) => update("experience", e.target.value)}
        >
          <option value="">Experience (any)</option>
          <option value="fresher">Fresher</option>
          <option value="1_3">1-3 yrs</option>
          <option value="3_5">3-5 yrs</option>
          <option value="5_plus">5+ yrs</option>
        </select>
      </div>
    </div>
  );
}
