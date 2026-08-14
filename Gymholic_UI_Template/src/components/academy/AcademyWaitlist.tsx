"use client";

import { useState, type FormEvent } from "react";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { MagneticButton } from "@/components/motion/MagneticButton";

/**
 * Local-only interest capture — there is no backend behind this yet
 * (the Academy has no live signup system), so submitting just moves to a
 * confirmation state client-side. Wire this to a real endpoint before this
 * page goes live, or the "you're on the list" message overpromises.
 */
export function AcademyWaitlist() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            className="rounded-full px-5 py-3 text-sm outline-none"
            style={{ background: "var(--surface)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
          />
          <input
            type="email"
            required
            placeholder="Email"
            className="rounded-full px-5 py-3 text-sm outline-none"
            style={{ background: "var(--surface)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.15)" }}
          />
          <button type="submit" className="btn-pill mx-auto mt-2">
            Join the Waitlist
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
