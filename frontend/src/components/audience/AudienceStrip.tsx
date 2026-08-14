"use client";

import { useState } from "react";
import { audiences, problems } from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";

/** Horizontal scroll-snap tabs over `audiences`; selecting one crossfades its emphasized problems. */
export function AudienceStrip() {
  const [activeId, setActiveId] = useState(audiences[0].id);
  const active = audiences.find((a) => a.id === activeId) ?? audiences[0];

  return (
    <section className="section-light py-24 px-6 md:px-10">
      <FadeUp as="div">
        <h2 className="display-text text-3xl md:text-5xl mb-10 max-w-2xl">
          Built for every kind of gym operator.
        </h2>
      </FadeUp>

      <div className="snap-row gap-3 pb-4 -mx-6 px-6 md:mx-0 md:px-0">
        {audiences.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActiveId(a.id)}
            className="snap-item px-5 py-3 rounded-full text-sm whitespace-nowrap transition-colors"
            style={{
              background: a.id === activeId ? "var(--orange)" : "rgba(245, 241, 232, 0.08)",
              color: a.id === activeId ? "var(--void)" : "var(--paper)",
            }}
          >
            {a.title}
          </button>
        ))}
      </div>

      <div key={activeId} className="audience-crossfade mt-10 grid md:grid-cols-2 gap-10">
        <p className="text-lg md:text-2xl leading-snug">{active.copy}</p>
        <ul className="space-y-3">
          {active.emphasis.map((idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm md:text-base opacity-80">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "var(--orange)" }}
              />
              {problems[idx]}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
