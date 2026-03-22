import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, FileSearch, FileText, Zap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Multi-platform search",
    desc: "JSearch, Adzuna, IndianAPI — one place",
  },
  {
    icon: FileText,
    title: "AI resume parsing",
    desc: "Claude extracts name, skills, experience",
  },
  {
    icon: Zap,
    title: "Match scores & cover letters",
    desc: "Smart matching + one-click apply",
  },
];

export default function Welcome() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) navigate("/app", { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--accent)]/5 blur-[100px]" />
      </div>

      <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full">
        {/* Hero - left on desktop */}
        <div className="flex-1 max-w-xl lg:max-w-none text-center lg:text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Smart job search with AI
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-[var(--primary)] leading-tight">
            Find your next role with ApplyFlow
          </h1>
          <p className="text-base sm:text-lg text-[var(--secondary)]">
            Upload your resume, get AI-powered match scores, cover letters, and track applications across platforms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-1">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent)]/90 focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 transition-all shadow-lg shadow-[var(--accent)]/20 text-sm"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 text-[var(--primary)] font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 transition-all text-sm"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Feature cards - right on desktop, compact */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg lg:max-w-none">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] p-4 shadow-md shadow-stone-900/5 dark:shadow-black/10"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mb-2">
                <Icon className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="font-semibold text-[var(--primary)] text-sm">{title}</h3>
              <p className="mt-0.5 text-xs text-[var(--secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative py-3 text-center text-xs text-[var(--secondary)]">
        ApplyFlow · React · FastAPI · Claude · Tailwind
      </footer>
    </div>
  );
}
