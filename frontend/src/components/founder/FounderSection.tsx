"use client";

import { useEffect, useRef, useState } from "react";
import { founder, whyGymholic } from "@/lib/content";
import { registerGsap, gsap, ScrollTrigger } from "@/components/motion/gsapConfig";
import { useTilt } from "@/components/motion/useTilt";

/**
 * Sticky-pinned narrative column (brief Section 5.1): founder card pinned
 * left, supporting differentiators scroll past on the right.
 */
export function FounderSection() {
  const headingRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  useTilt(photoRef, { maxTilt: 10 });

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    registerGsap();
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: heading,
        start: "top top",
        end: "+=100%",
        pin: true,
      });
    }, heading);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section-dark px-6 md:px-10 py-24">
      <div className="grid md:grid-cols-2 gap-12">
        <div ref={headingRef} className="self-start">
          <p className="text-sm tracking-widest uppercase mb-6" style={{ color: "var(--orange)" }}>
            Meet the Founder
          </p>

          <div className="flex items-center gap-6 mb-8">
            <div
              ref={photoRef}
              className="tilt-shadow relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shrink-0"
              style={{ background: "var(--surface)" }}
            >
              <div className="tilt-glare" aria-hidden="true" />
              {!photoFailed && (
                <img
                  src={founder.photo}
                  alt={founder.name}
                  className="w-full h-full object-cover"
                  onError={() => setPhotoFailed(true)}
                />
              )}
              {photoFailed && (
                <div
                  className="w-full h-full flex items-center justify-center display-text text-4xl"
                  style={{ color: "var(--orange)" }}
                >
                  {founder.name[0]}
                </div>
              )}
            </div>

            <div>
              <h2 className="display-hero text-3xl md:text-4xl">{founder.name}</h2>
              <p className="text-sm opacity-60 mt-1">
                Known as <span style={{ color: "var(--orange)" }}>{founder.nickname}</span>
              </p>
              <p className="text-sm mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,106,0,0.12)", color: "var(--orange)" }}>
                {founder.yearsInIndustry} Years in the Industry
              </p>
            </div>
          </div>

          <h3 className="display-text text-2xl md:text-4xl leading-tight max-w-md">
            Consulting built by people who&apos;ve run the floor, not just the spreadsheet.
          </h3>
        </div>

        <ul className="space-y-16 md:pt-8">
          {whyGymholic.map((reason, i) => (
            <li key={reason} className="border-t border-white/10 pt-6">
              <span className="text-xs opacity-40">0{i + 1}</span>
              <p className="display-text text-2xl md:text-3xl mt-3">{reason}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
