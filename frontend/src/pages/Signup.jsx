import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Mail, Lock, Briefcase } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AuthLayout from "../components/AuthLayout";

export default function Signup() {
  const { register, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/app", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message || "Sign up failed");
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

  const inputBase = "w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-200/80 dark:border-stone-600/80 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm text-[var(--primary)] placeholder:text-stone-400 outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:bg-white dark:focus:bg-stone-900 disabled:opacity-60";

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px] opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <Link to="/" className="flex items-center justify-center gap-2 mb-10 group">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/30 transition-shadow">
            <Briefcase className="w-5 h-5" />
          </span>
          <span className="font-heading text-3xl text-stone-800 dark:text-stone-100">ApplyFlow</span>
        </Link>
        <div className="rounded-3xl border border-stone-200/60 dark:border-stone-700/60 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl shadow-2xl shadow-stone-900/10 dark:shadow-black/30 p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Create your account</h1>
            <p className="mt-2 text-[15px] text-stone-600 dark:text-stone-400">
              Get started with smart job search and AI-powered tools
            </p>
          </div>

          {error && (
            <div
              className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/50 backdrop-blur-sm"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-[var(--accent)] transition-colors" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className={inputBase}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-[var(--accent)] transition-colors" />
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  className={inputBase}
                  placeholder="Min 6 characters"
                />
              </div>
              <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">Must be at least 6 characters</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/30 hover:brightness-105 focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-600" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white/70 dark:bg-stone-900/70 px-4 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                or continue with
              </span>
            </div>
          </div>

          <GoogleSignInButton
            text="signup_with"
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg || "Google sign-in failed")}
          />
        </div>

        <p className="mt-8 text-center text-[15px] text-stone-600 dark:text-stone-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[var(--accent)] hover:text-orange-700 dark:hover:text-orange-400 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
