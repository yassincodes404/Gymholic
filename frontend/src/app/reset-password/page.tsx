/*! GymHolic Reset Password — consumes the emailed token and sets a new password. */

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      router.push("/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16 relative">
      <Link
        href="/login"
        className="absolute top-6 left-6 text-sm text-paper/60 hover:text-paper transition-colors"
      >
        ← Back to sign in
      </Link>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Choose a new password</h1>
        <p className="text-paper/60 text-center mb-8">
          Your reset link is valid for 30 minutes and works once.
        </p>

        <div className="bg-surface border border-paper/10 rounded-2xl p-8">
          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-red-400 text-sm">This page needs a reset link from your email.</p>
              <Link href="/forgot-password" className="text-orange underline hover:no-underline">
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-paper/75">
                  New password
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-2 text-paper/75">
                  Confirm new password
                </label>
                <input
                  type="password"
                  id="confirm"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="Repeat the new password"
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
                {busy ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
