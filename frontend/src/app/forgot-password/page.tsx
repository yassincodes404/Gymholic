/*! GymHolic Forgot Password — emails a single-use reset link (30 min TTL). */

"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16 relative">
      <Link
        href="/login"
        className="absolute top-6 left-6 text-sm text-paper/60 hover:text-paper transition-colors"
      >
        ← Back to sign in
      </Link>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Reset your password</h1>
        <p className="text-paper/60 text-center mb-8">
          We&apos;ll email you a single-use link to choose a new password.
        </p>

        <div className="bg-surface border border-paper/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-paper/80">
                If <strong>{email}</strong> has an account, a reset link is on its
                way. It expires in 30 minutes.
              </p>
              <p className="text-sm text-paper/50">
                Didn&apos;t get it? Check spam, or{" "}
                <button
                  className="text-orange underline hover:no-underline"
                  onClick={() => setSent(false)}
                >
                  try again
                </button>{" "}
                in a few minutes.
              </p>
              <Link href="/login" className="inline-block text-orange underline hover:no-underline">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-paper/75">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60"
                  placeholder="you@example.com"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-orange text-void font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-sm text-paper/60 text-center">
                <Link href="/login" className="text-orange underline hover:no-underline">
                  ← Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
