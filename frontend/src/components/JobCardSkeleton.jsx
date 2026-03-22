export default function JobCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] px-3 py-2.5 animate-pulse flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mb-1.5" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
      </div>
      <div className="h-8 w-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
    </div>
  );
}
