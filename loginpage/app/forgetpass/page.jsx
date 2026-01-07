"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const passwordsOk = useMemo(() => newPassword.trim().length >= 6, [newPassword]);
  const matchOk = useMemo(() => newPassword === confirmNewPassword, [newPassword, confirmNewPassword]);

  async function getQuestion(e) {
    e.preventDefault();
    setError("");

    if (!emailOk) return setError("Please enter a valid email.");

    try {
      setIsSubmitting(true);

      // TODO: call backend to fetch security question by email
      // const res = await fetch("/api/auth/forgot", { method:"POST", headers:{ "Content-Type":"application/json" },
      //   body: JSON.stringify({ email })
      // });
      // const data = await res.json();
      // setQuestion(data.question);

      await new Promise((r) => setTimeout(r, 600));
      setQuestion("What is your favourite colour? (demo)");
      setStep(2);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not proceed.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");

    if (!answer.trim()) return setError("Please enter your answer.");
    if (!passwordsOk) return setError("New password must be at least 6 characters.");
    if (!matchOk) return setError("Passwords do not match.");

    try {
      setIsSubmitting(true);

      // TODO: backend verify answer hash, then update password hash
      // await fetch("/api/auth/reset", { method:"POST", headers:{ "Content-Type":"application/json" },
      //   body: JSON.stringify({ email, answer, newPassword })
      // });

      const normalizedAnswer = answer.trim().toLowerCase();

      await new Promise((r) => setTimeout(r, 700));
      alert("Password reset (demo). Please sign in.");

      // optionally redirect:
      // window.location.href = "/";

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-xl border border-white/40">
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
              <p className="text-slate-600 mt-1">Reset using your security question.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={getQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800">Email</label>
                  <input
                    type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="mt-2 w-full rounded-xl bg-white text-slate-900 border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                  autoComplete="email"
                  required
                  />
                </div>

                <button
                  type="submit"
                  disabled={!emailOk || isSubmitting}
                  className="w-full rounded-xl bg-white text-black font-medium py-3 hover:bg-slate-950/60 hover:text-white hover:transition-all duration-300 ease-out disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Loading..." : "Continue"}
                </button>

                <div className="pt-2 text-center text-sm text-slate-600">
                  <Link href="/" className="text-black underline underline-offset-4 hover:text-blue-500">
                    Back to sign in
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Security question</div>
                  <div className="mt-1 font-medium text-slate-800">{question}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Answer</label>
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-white text-slate-900 border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-white text-slate-900 border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-white text-slate-900 border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-white text-black font-medium py-3 hover:bg-slate-950/60 hover:text-white hover:transition-all duration-300 ease-out disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Resetting..." : "Reset password"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl bg-white text-black font-medium py-3 hover:bg-slate-950/60 hover:text-white hover:transition-all duration-300 ease-out disabled:cursor-not-allowed"
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
