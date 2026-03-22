/**
 * Consistent wrapper for auth pages (Login, Signup).
 * Provides rich gradient background, depth, and footer.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f6f3] dark:bg-[#0a0908]">
      {/* Rich gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-stone-50/90 to-orange-50/70 dark:from-stone-950 dark:via-amber-950/20 dark:to-stone-950" />
        {/* Accent orbs */}
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-300/20 dark:bg-amber-600/10 blur-[80px] animate-float" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-orange-200/25 dark:bg-orange-900/15 blur-[60px]" />
        <div className="absolute -bottom-20 right-1/3 w-64 h-64 rounded-full bg-amber-200/20 dark:bg-amber-800/10 blur-[50px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px),
                             linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        {children}
      </div>

      <footer className="relative py-5 text-center text-xs text-stone-500 dark:text-stone-500">
        ApplyFlow · Smart job search with AI
      </footer>
    </div>
  );
}
