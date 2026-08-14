"use client";

import { useState } from "react";
import { faqs } from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";

/** Numbered accordion with a sliding ember rule-line indicator — new chrome, same functional pattern. */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section-light py-24 px-6 md:px-10">
      <FadeUp as="div">
        <h2 className="display-text text-3xl md:text-5xl mb-14 max-w-2xl">
          Questions gym owners actually ask.
        </h2>
      </FadeUp>

      <div className="max-w-3xl">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={faq.q} className="faq-row" data-open={isOpen}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center gap-4 py-6 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm opacity-40 shrink-0">0{i + 1}</span>
                <span className="flex-1 text-base md:text-lg">{faq.q}</span>
                <span
                  className="shrink-0 transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", color: "var(--orange)" }}
                >
                  +
                </span>
              </button>
              <div className="faq-answer">
                <div>
                  <p className="pb-6 pl-9 opacity-70 max-w-2xl">{faq.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
