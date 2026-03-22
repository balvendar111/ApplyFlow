import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Mail, Lock, Briefcase, Sparkles, Globe, Zap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import LoginIllustration from "../components/LoginIllustration";

export default function Login() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/app", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (cred) => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(cred);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-[var(--primary)] placeholder:text-stone-400 outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 hover:border-stone-300 dark:hover:border-stone-500 disabled:opacity-60";

  const jobFeatures = [
    { icon: Sparkles, label: "AI matching" },
    { icon: Globe, label: "Multi-platform" },
    { icon: Zap, label: "One-click apply" },
  ];

  return (
    <div className="fixed inset-0 flex bg-gradient-to-br from-[var(--bg)] via-amber-50/30 to-[var(--bg)] dark:from-[var(--bg)] dark:via-stone-950 dark:to-[var(--bg)]">
      {/* Left - Form (slightly more width on desktop for balance) */}
      <div className="flex-1 lg:flex-[1.15] flex flex-col min-h-0 lg:overflow-y-auto relative">
        {/* Subtle warm accent orbs - premium depth */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--accent)]/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 -left-24 w-64 h-64 rounded-full bg-amber-200/25 dark:bg-amber-900/15 blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full bg-orange-200/15 dark:bg-orange-900/10 blur-[60px] pointer-events-none" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-20 xl:px-24 py-6 sm:py-8 relative">
          <div className="w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[520px] mx-auto text-center">
            <Link to="/" className="inline-flex items-center justify-center gap-3 mb-6 group transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:shadow-xl group-hover:shadow-orange-500/35 transition-all duration-300">
                <Briefcase className="w-6 h-6" />
              </span>
              <span className="font-heading text-2xl sm:text-3xl font-normal text-[var(--primary)] tracking-tight">ApplyFlow</span>
            </Link>

            <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary)] leading-tight mt-2 whitespace-nowrap">
              Smart Job Search <span className="text-[var(--accent)]">Powered By AI</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--secondary)]">
              Sign in to discover your next opportunity across top job platforms.
            </p>

            {/* Job-search feature pills */}
            <div className="mt-4 flex flex-wrap sm:flex-nowrap gap-2 justify-center">
              {jobFeatures.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 text-[var(--secondary)] text-xs font-medium shadow-sm hover:border-[var(--accent)]/30 hover:shadow-md transition-all duration-200"
                >
                  <span className="text-[var(--accent)]"><Icon className="w-3.5 h-3.5" /></span>
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-6 p-5 sm:p-6 pl-6 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/70 shadow-lg shadow-stone-200/60 dark:shadow-black/25 backdrop-blur-sm relative overflow-hidden text-left">
              <div className="absolute top-0 left-0 w-1 h-20 rounded-r-full bg-gradient-to-b from-[var(--accent)] to-amber-500" />
              <p className="text-xs font-semibold text-[var(--accent)] mb-3 text-center">Continue your job search</p>
              {error && (
                <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-[var(--primary)] mb-0.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={loading}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="login-password" className="block text-xs font-medium text-[var(--primary)]">Password</label>
                    <Link to="/forgot-password" className="text-xs font-medium text-[var(--accent)] hover:underline">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 rounded border-stone-300 text-[var(--accent)]"
                  />
                  <label htmlFor="remember-me" className="text-xs text-[var(--secondary)]">Remember Me</label>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-amber-600 text-white font-semibold text-sm shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:brightness-105 disabled:opacity-60 disabled:hover:brightness-100 flex items-center justify-center gap-2 transition-all duration-200"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Logging in...</> : "Login"}
                </button>
                <Link
                  to="/signup"
                  className="w-full py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-[var(--primary)] font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-400 dark:hover:border-stone-500 flex items-center justify-center transition-all duration-200"
                >
                  Create Account
                </Link>
              </form>
              <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 flex flex-col items-center gap-1.5">
                <p className="text-xs text-[var(--secondary)]">Or continue with</p>
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={(msg) => setError(msg || "Google sign-in failed")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Illustration (desktop, slightly narrower) */}
      <div className="hidden lg:flex flex-[0.85] min-w-0 items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50/40 to-amber-100/60 dark:from-stone-900 dark:via-orange-950/15 dark:to-stone-950 p-8 shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23ea580c' stroke-width='0.5' fill='none'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-orange-100/30 via-transparent to-transparent dark:from-orange-950/20 pointer-events-none" />
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-stone-400 dark:text-stone-500">
          Naukri · JSearch · Adzuna · IndianAPI
        </p>
        <div className="relative w-full max-w-[340px] max-h-[90vh] pb-8 drop-shadow-xl">
          <LoginIllustration />
        </div>
      </div>
    </div>
  );
}
