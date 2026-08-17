/*!
  GymHolic Email Verification — 6-digit code step shown after sign-up / sign-in
  when the backend answers with a verification challenge.
*/

"use client";

import { useState } from "react";
import { resendVerificationCode, verifyEmail, type AuthUser } from "@/lib/auth";

const inputClass =
  "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60 tracking-[0.5em] text-center text-lg font-semibold";

export default function EmailVerificationForm({
  email,
  onVerified,
}: {
  email: string;
  onVerified: (user: AuthUser) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const user = await verifyEmail(email, code.trim());
      onVerified(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setResendBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resendVerificationCode(email);
      setNotice("A new code is on its way to your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not re-send the code.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Check your email</h2>
      <p className="text-paper/60 text-sm mb-6">
        We sent a 6-digit confirmation code to{" "}
        <span className="text-paper/90 font-medium">{email}</span>. Enter it
        below to finish signing in. The code expires in 10 minutes.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium mb-2 text-paper/75">
            Confirmation code
          </label>
          <input
            type="text"
            id="verification-code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={inputClass}
            placeholder="••••••"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="text-emerald-400 text-sm">{notice}</p>}

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full bg-orange text-void font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50"
        >
          {busy ? "Verifying…" : "Verify and continue"}
        </button>
      </form>

      <p className="text-sm text-paper/60 text-center mt-6">
        Didn&apos;t get the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendBusy}
          className="text-paper underline hover:no-underline disabled:opacity-50"
        >
          {resendBusy ? "Sending…" : "Send it again"}
        </button>
      </p>
    </div>
  );
}
