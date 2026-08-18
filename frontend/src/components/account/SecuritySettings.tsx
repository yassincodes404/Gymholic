/*!
  Account security settings — change password, change email address
  (confirmed with a code emailed to the new address) and account deletion.
  Every action here triggers its confirmation email on the backend.
*/

"use client";

import { useState } from "react";
import { buildBackendApiUrl, getStoredAuthToken } from "@/lib/api";
import { logout } from "@/lib/auth";

type Feedback = { kind: "ok" | "err"; text: string } | null;

async function call(path: string, method: string, body: unknown): Promise<string | null> {
  const token = getStoredAuthToken();
  const res = await fetch(buildBackendApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    return payload?.message || "Something went wrong. Please try again.";
  }
  return null;
}

const inputClass =
  "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";
const buttonClass =
  "bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50";

function PasswordChangeCard() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const error = await call("users/me/password", "PUT", { currentPassword, newPassword });
    setBusy(false);
    if (error) return setFeedback({ kind: "err", text: error });
    setCurrent("");
    setNew("");
    setFeedback({ kind: "ok", text: "Password changed — check your inbox for the confirmation email." });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-paper/75">Current password</label>
        <input type="password" required autoComplete="current-password" value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)} className={inputClass} placeholder="••••••••" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-paper/75">New password</label>
        <input type="password" required minLength={8} autoComplete="new-password" value={newPassword}
          onChange={(e) => setNew(e.target.value)} className={inputClass} placeholder="At least 8 characters" />
      </div>
      {feedback && (
        <p className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {feedback.text}
        </p>
      )}
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

function EmailChangeCard() {
  const [stage, setStage] = useState<"request" | "confirm">("request");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const error = await call("users/me/email/change-request", "POST", { newEmail });
    setBusy(false);
    if (error) return setFeedback({ kind: "err", text: error });
    setStage("confirm");
    setFeedback({ kind: "ok", text: `Confirmation code sent to ${newEmail} (valid 10 minutes).` });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const error = await call("users/me/email/confirm", "POST", { code });
    setBusy(false);
    if (error) return setFeedback({ kind: "err", text: error });
    // Email changed → the stored session user is stale; sign back in.
    logout();
    window.location.href = "/login";
  }

  return stage === "request" ? (
    <form onSubmit={request} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-paper/75">New email address</label>
        <input type="email" required autoComplete="email" value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)} className={inputClass}
          placeholder="new-you@example.com" />
      </div>
      <p className="text-xs text-paper/50">
        We&apos;ll email a 6-digit code to the new address to confirm it before the change applies.
      </p>
      {feedback && (
        <p className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {feedback.text}
        </p>
      )}
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? "Sending…" : "Send confirmation code"}
      </button>
    </form>
  ) : (
    <form onSubmit={confirm} className="space-y-4">
      <p className="text-sm text-paper/60">Code sent to <strong>{newEmail}</strong>:</p>
      <div>
        <label className="block text-sm font-medium mb-2 text-paper/75">6-digit code</label>
        <input type="text" required inputMode="numeric" pattern="\d{6}" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`${inputClass} text-center text-xl tracking-[0.4em]`} placeholder="······" />
      </div>
      {feedback && (
        <p className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {feedback.text}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Confirming…" : "Confirm new email"}
        </button>
        <button type="button" className="text-sm text-paper/60 hover:text-paper"
          onClick={() => setStage("request")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteAccountCard() {
  const [password, setPassword] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const error = await call("users/me", "DELETE", { password });
    setBusy(false);
    if (error) return setFeedback({ kind: "err", text: error });
    logout();
    window.location.href = "/";
  }

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)}
        className="text-red-400 underline underline-offset-4 hover:no-underline text-sm">
        Delete my account…
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-red-300">
        This permanently removes your personal data. Bookings and payments are kept
        for accounting but anonymised. Type your password to confirm.
      </p>
      <div>
        <label className="block text-sm font-medium mb-2 text-paper/75">Password</label>
        <input type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
      </div>
      {feedback && <p className="text-sm text-red-400">{feedback.text}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy}
          className="bg-red-500/90 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-red-500 disabled:opacity-50">
          {busy ? "Deleting…" : "Permanently delete"}
        </button>
        <button type="button" className="text-sm text-paper/60 hover:text-paper" onClick={() => setArmed(false)}>
          Keep my account
        </button>
      </div>
    </form>
  );
}

export function SecuritySettings() {
  return (
    <section className="mb-10">
      <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-4">Security</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="bg-surface border border-paper/10 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Change password</h3>
          <PasswordChangeCard />
        </div>
        <div className="bg-surface border border-paper/10 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Change email address</h3>
          <EmailChangeCard />
        </div>
      </div>
      <div className="mt-5">
        <DeleteAccountCard />
      </div>
    </section>
  );
}
