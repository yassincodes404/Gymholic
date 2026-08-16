"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { buildBackendApiUrl } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

/**
 * Waitlist signup — persisted server-side via POST /api/whitelist
 * (guest-friendly; email is pre-filled for signed-in users).
 */
export function AcademyWaitlist() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setEmail(user.email);
      setName(user.firstName || "");
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(buildBackendApiUrl("whitelist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source: "ACADEMY" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not join the waitlist. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the waitlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="waitlist" className="section-dark py-32 px-6 md:px-10 text-center">
      <SplitHeadline
        as="h2"
        text="Be First Inside Gymholic Academy."
        className="display-hero text-4xl md:text-6xl max-w-3xl mx-auto mb-6"
      />
      <p className="opacity-70 max-w-md mx-auto mb-10">
        Join the waitlist and get notified when the Academy opens.
      </p>

      {submitted ? (
        <p className="text-lg" style={{ color: "var(--orange)" }}>
          You&apos;re on the list — we&apos;ll be in touch when Academy opens.
        </p>
      ) : open ? (
        <form onSubmit={handleSubmit} className="max-w-sm mx-auto flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-full px-5 py-3 text-sm outline-none"
            style={{ background: "var(--surface)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full px-5 py-3 text-sm outline-none"
            style={{ background: "var(--surface)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--orange)" }} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-pill mx-auto mt-2 disabled:opacity-50">
            {busy ? "Joining…" : "Join the Waitlist"}
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <MagneticButton onClick={() => setOpen(true)} className="btn-pill">
            Join the Academy
          </MagneticButton>
          <button onClick={() => setOpen(true)} className="btn-pill btn-pill--ghost">
            Notify Me
          </button>
        </div>
      )}
    </section>
  );
}
