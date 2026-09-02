/*!
  GymHolic Contact / Support — the client's way to reach a human when
  something goes wrong (booking issue, payment question, digital product).
  Messages persist server-side and alert the team by email.
*/

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";
import { buildBackendApiUrl } from "@/lib/api";
import { getStoredAuthToken, getStoredUser } from "@/lib/auth";

const CATEGORIES = [
  { value: "BOOKING", label: "Booking & scheduling" },
  { value: "PAYMENT", label: "Payment & refund" },
  { value: "DIGITAL_PRODUCT", label: "Blueprint / digital product" },
  { value: "ACCOUNT", label: "My account" },
  { value: "OTHER", label: "Something else" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill for signed-in users — one less thing to type when frustrated.
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setName([user.firstName, user.lastName].filter(Boolean).join(" "));
      setEmail(user.email);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = getStoredAuthToken();
      const res = await fetch(buildBackendApiUrl("support"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, email, category, subject, message }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not send your message. Please try again.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
            Support
          </p>
          <h1 className="display-hero text-4xl md:text-5xl mb-6">Talk to a human.</h1>
          <p className="opacity-70 mb-12 max-w-lg">
            Something went wrong with a booking, a payment, or a purchase?
            Write to us here — messages land with our team directly and we
            answer every one.
          </p>

          {sent ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px solid rgba(255,106,0,0.25)" }}
            >
              <p className="text-lg mb-2" style={{ color: "var(--orange)" }}>
                Message sent ✅
              </p>
              <p className="text-sm opacity-70 mb-6">
                A confirmation is on its way to your inbox, and we&apos;ll reply
                to <b>{email}</b> as soon as possible.
              </p>
              <Link href="/" className="btn-pill">
                Back to Home
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-6 md:p-8 space-y-4"
              style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.12)" }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider opacity-50 block mb-1.5">Your name</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange"
                    style={{ background: "var(--void)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider opacity-50 block mb-1.5">Your email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange"
                    style={{ background: "var(--void)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs uppercase tracking-wider opacity-50 block mb-1.5">What is it about?</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange"
                  style={{ background: "var(--void)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider opacity-50 block mb-1.5">Subject</span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="e.g. Payment taken but booking not confirmed"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange"
                  style={{ background: "var(--void)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider opacity-50 block mb-1.5">Message</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-orange resize-y"
                  style={{ background: "var(--void)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
                />
              </label>
              {error && (
                <p className="text-sm" style={{ color: "var(--orange)" }} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="btn-pill w-full justify-center disabled:opacity-50">
                {busy ? "Sending…" : "Send message"}
              </button>
              <p className="text-xs opacity-40 text-center">
                We reply to every message — usually within one business day.
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
