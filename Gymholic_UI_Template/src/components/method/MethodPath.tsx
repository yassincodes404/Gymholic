"use client";

import { useEffect, useRef, useState } from "react";
import { approachSteps } from "@/lib/content";
import {
  registerGsap,
  gsap,
  ScrollTrigger,
  MotionPathPlugin,
} from "@/components/motion/gsapConfig";

const STEP_COUNT = approachSteps.length;

// Zigzag path through 6 nodes in a 1000x600 viewBox — the "journey" line.
const NODES: [number, number][] = [
  [80, 500],
  [260, 140],
  [440, 480],
  [620, 160],
  [800, 460],
  [920, 120],
];

function buildPathD(nodes: [number, number][]) {
  return nodes
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}

/**
 * Signature element: "The Path". A hand-drawn SVG line diagram of the
 * 6-step method draws itself in via stroke-dashoffset scrub while a marker
 * dot travels the same path (MotionPathPlugin), pinned for 400vh. Replaces
 * the burn-transition as the site's one memorable moment.
 */
export function MethodPath() {
  const pinRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    const pin = pinRef.current;
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!pin || !path || !dot) return;

    registerGsap();
    const ctx = gsap.context(() => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.set(dot, { autoAlpha: 1 });

      const reduceMotion = reduceMotionRef.current;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=300%",
          scrub: reduceMotion ? false : 1,
          pin: !reduceMotion,
          onUpdate: (self) => {
            const step = Math.min(
              STEP_COUNT - 1,
              Math.floor(self.progress * STEP_COUNT)
            );
            setActiveStep(step);
          },
        },
      });

      tl.to(path, { strokeDashoffset: 0, ease: "none" }, 0);
      tl.to(
        dot,
        {
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
          },
          ease: "none",
        },
        0
      );
    }, pin);

    return () => ctx.revert();
  }, []);

  return (
    <section id="method" className="section-dark">
      <div ref={pinRef} className="min-h-screen flex items-center px-6 md:px-10 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          <div>
            <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
              The Method
            </p>
            <h2 className="display-text text-4xl md:text-5xl mb-6">
              {approachSteps[activeStep].step} — {approachSteps[activeStep].title}
            </h2>
            <p className="text-lg opacity-70 max-w-md">{approachSteps[activeStep].copy}</p>

            <ol className="mt-10 flex flex-wrap gap-2">
              {approachSteps.map((s, i) => (
                <li
                  key={s.step}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{
                    background: i === activeStep ? "var(--orange)" : "rgba(255,255,255,0.08)",
                    color: i === activeStep ? "var(--void)" : "var(--paper)",
                    opacity: i <= activeStep ? 1 : 0.4,
                  }}
                >
                  {s.step}
                </li>
              ))}
            </ol>
          </div>

          <svg viewBox="0 0 1000 600" className="w-full h-auto" aria-hidden="true">
            <path
              d={buildPathD(NODES)}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={2}
            />
            <path
              ref={pathRef}
              d={buildPathD(NODES)}
              fill="none"
              stroke="var(--orange)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {NODES.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i <= activeStep ? 7 : 4}
                fill={i <= activeStep ? "var(--orange)" : "rgba(255,255,255,0.25)"}
                style={{ transition: "r 0.3s ease, fill 0.3s ease" }}
              />
            ))}
            <circle ref={dotRef} r={10} fill="var(--paper)" opacity={0} />
          </svg>
        </div>
      </div>
    </section>
  );
}
