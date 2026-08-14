"use client";

import { useRef } from "react";
import { academyFeatures, type AcademyFeature } from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";
import { useTilt } from "@/components/motion/useTilt";

function FeatureCard({ feature, index }: { feature: AcademyFeature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, { maxTilt: 10 });

  return (
    <div
      ref={ref}
      className="tilt-shadow relative service-card service-card--dark"
    >
      <div className="tilt-glare" aria-hidden="true" />
      <span className="text-xs opacity-50">0{index + 1}</span>
      <h3 className="display-text text-lg mt-4 mb-3">{feature.title}</h3>
      <p className="text-sm opacity-70">{feature.copy}</p>
    </div>
  );
}

/** "What is Gymholic Academy" + "What you'll get" — same bento card language as the homepage services grid. */
export function AcademyFeatures() {
  return (
    <section className="section-light py-24 px-6 md:px-10">
      <FadeUp as="div">
        <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
          What Is Gymholic Academy?
        </p>
        <h2 className="display-text text-3xl md:text-5xl mb-14 max-w-2xl">
          The systems, videos, and playbooks behind running a gym properly — in one members-only library.
        </h2>
      </FadeUp>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {academyFeatures.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
