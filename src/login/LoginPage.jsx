import React, { useMemo, useState } from "react";
import SignupPage from "./SignupPage";
import ForgotPassword from "./ForgotPassword";

export default function LoginPage({ onLogin }) {
  // hooks must be called unconditionally at the top-level
  const [view, setView] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const passwordOk = useMemo(() => password.trim().length >= 6, [password]);
  const canSubmit = emailOk && passwordOk && !isSubmitting;

  if (view === "signup") {
    return <SignupPage onBack={() => setView("login")} />;
  }

  if (view === "forgot") {
    return <ForgotPassword onBack={() => setView("login")} />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!emailOk) return setError("Please enter a valid email.");
    if (!passwordOk) return setError("Password must be at least 6 characters.");

    try {
      setIsSubmitting(true);

      // demo delay (replace with real API later)
      await new Promise((r) => setTimeout(r, 800));

      // Simple demo: call onLogin to switch to main app
      onLogin?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-blue-500 text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white border border-white/30 shadow-lg transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl">
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="text-black mt-1">Log in to continue.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="mt-2 w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Password</label>
                <div className="mt-2 relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700"
                    autoComplete="current-password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-black select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950/60"
                    />
                    Remember me
                  </label>

                  <button type="button" onClick={() => setView("forgot")} className="text-sm text-black hover:text-blue-500 underline underline-offset-4">
                    Forgot password?
                  </button>
                </div>
              </div>

              <button type="submit" disabled={!canSubmit} className="w-full rounded-xl bg-white text-BLACK font-medium py-3 hover:bg-slate-950/60 hover:text-white hover:transition-all duration-300 ease-out disabled:cursor-not-allowed">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>

              <div className="border-t border-slate-800 px-8 text-xs text-slate-400"></div>
              <div className="text-center text-sm text-black">
                Don’t have an account?{' '}
                <button type="button" onClick={() => setView("signup")} className="text-black hover:text-blue-500 underline underline-offset-4">
                  Sign up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
