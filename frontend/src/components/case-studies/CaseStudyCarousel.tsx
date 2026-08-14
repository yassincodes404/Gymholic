"use client";

import { useEffect, useRef } from "react";
import { caseStudies, type CaseStudy } from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";
import { CounterMetric } from "./CounterMetric";
import { registerGsap, gsap, ScrollTrigger } from "@/components/motion/gsapConfig";
import { useTilt } from "@/components/motion/useTilt";

const SLIDE_COUNT = caseStudies.length;

function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, { maxTilt: 10 });

  return (
    <article
      ref={ref}
      className="tilt-shadow relative overflow-hidden w-[85vw] md:w-[65vw] lg:w-[60vw] rounded-2xl p-8 md:p-12 shrink-0"
      style={{ background: "var(--surface)" }}
    >
      <div className="tilt-glare" aria-hidden="true" />
      <p className="text-sm uppercase tracking-widest mb-6" style={{ color: "var(--orange)" }}>
        {cs.location}
      </p>
      <div className="display-hero text-6xl md:text-7xl mb-4" style={{ color: "var(--orange)" }}>
        <CounterMetric from={cs.from ?? 0} to={cs.to} suffix={cs.metricSuffix} />
      </div>
      <p className="text-lg mb-2">{cs.metricLabel}</p>
      <p className="opacity-60 mb-6">{cs.keyMetric}</p>
      <p className="opacity-80">{cs.result}</p>
    </article>
  );
}

/**
 * Horizontal scroll section (brief Section 6): the section pins and
 * vertical scroll translates the row horizontally, with
 * ScrollTrigger.snap locking onto each slide on release. Exactly two
 * slides — Dubai and Sharjah, the only real case studies Gymholic has. No
 * third slide is added to "fill it out."
 */
export function CaseStudyCarousel() {
  const pinRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pin = pinRef.current;
    const row = rowRef.current;
    if (!pin || !row) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    registerGsap();
    row.style.overflowX = "hidden";
    row.style.scrollSnapType = "none";

    const ctx = gsap.context(() => {
      const travel = () => row.scrollWidth - pin.clientWidth;

      gsap.to(row, {
        x: () => -travel(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${travel()}`,
          scrub: 1,
          pin: true,
          snap: 1 / (SLIDE_COUNT - 1),
          invalidateOnRefresh: true,
        },
      });
    }, pin);

    return () => ctx.revert();
  }, []);

  return (
    <section id="results" className="section-dark">
      <div ref={pinRef} className="py-24">
        <div className="px-6 md:px-10">
          <FadeUp as="div">
            <h2 className="display-text text-3xl md:text-5xl mb-4 max-w-2xl">
              Two real results. No inflated numbers.
            </h2>
            <p className="opacity-60 max-w-lg mb-12">
              These are the only numeric claims on this site — everything else stays qualitative.
            </p>
          </FadeUp>
        </div>

        <div ref={rowRef} className="snap-row gap-6 px-6 md:px-10 w-max">
          {caseStudies.map((cs) => (
            <CaseStudyCard key={cs.location} cs={cs} />
          ))}
        </div>
      </div>
    </section>
  );
}
