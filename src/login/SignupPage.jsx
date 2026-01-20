import React, { useMemo, useState } from "react";

const QUESTIONS = [
  "What is your favourite colour?",
  "What is your mother’s maiden name?",
  "What city were you born in?",
  "What was the name of your first school?",
];

export default function SignupPage({ onBack, onSignupSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1);
  const [securityQuestion, setSecurityQuestion] = useState(QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("student");

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const passwordOk = useMemo(() => password.trim().length >= 6, [password]);
  const passwordsMatch = useMemo(() => password === confirmPassword && confirmPassword.length > 0, [password, confirmPassword]);

  function handleContinue(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Please enter your name.");
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError("Please enter a valid email.");
    if (password.trim().length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setStep(2);
  }

  const canSubmit = name.trim().length > 0 && emailOk && passwordOk && passwordsMatch && !isSubmitting;

  async function handleSubmitFinal(e) {
    e.preventDefault();
    setError("");

    if (!securityAnswer.trim()) return setError("Please provide an answer.");

    try {
      setIsSubmitting(true);

      // demo API delay
      await new Promise((r) => setTimeout(r, 800));

      onSignupSuccess?.(role);
    } catch (err) {
      setError(err?.message || "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-blue-500 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white border border-white/40 shadow-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl">
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Create an account</h1>
              <p className="text-slate-600 mt-1">Sign up to get started.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-800">Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700" autoComplete="name" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">Password</label>
                <div className="mt-2 relative">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700" autoComplete="new-password" required minLength={6} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Minimum 6 characters.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">Confirm password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700" autoComplete="new-password" required />
              </div>

              <div className="max-w-sm">
                <label className="block text-sm font-medium text-black">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700">
                  <option value="student">Student/Guest</option>
                  <option value="event_manager">Event Manager</option>
                  <option value="admin">Administrator</option>
                  <option value="onsite_manager">On-site Manager</option>
                </select>
              </div>

              {step === 1 && (
                <button type="submit" disabled={!canSubmit} className="w-full rounded-xl bg-white text-black font-medium py-3 hover:bg-slate-950/60 hover:text-white transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
              )}
            </form>

            <div className={`overflow-hidden transition-all duration-300 ease-out ${step === 2 ? "max-h-[520px] mt-6" : "max-h-0"}`}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Security questions</div>
              </div>

              <form onSubmit={handleSubmitFinal} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800">Security question</label>
                  <select value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700" required>
                    <option value="What is your favourite colour?">What is your favourite colour?</option>
                    <option value="What city were you born in?">What city were you born in?</option>
                    <option value="What was your first school?">What was your first school?</option>
                    <option value="What is your pet’s name?">What is your pet’s name?</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Your answer</label>
                  <input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Answer" className="w-full rounded-xl bg-slate-750/60 border border-slate-800 px-4 py-3 pr-5 outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-700" required />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="w-1/3 rounded-xl bg-white text-black font-medium py-3 border border-slate-200 hover:bg-slate-100 transition-all duration-300 ease-out">Back</button>
                  <button type="submit" disabled={isSubmitting} className="w-2/3 rounded-xl bg-white text-black font-medium py-3 hover:bg-slate-950/60 hover:text-white transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? "Creating..." : "Create account"}</button>
                </div>
              </form>
            </div>

            <div className="pt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <button onClick={onBack} className="text-black hover:text-blue-500 underline underline-offset-4">Sign in</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
