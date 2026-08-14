"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { registerGsap, gsap, ScrollTrigger, EASE } from "./gsapConfig";

type FadeUpProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
};

/**
 * The sitewide baseline reveal (brief Section 5.4): yPercent 20 + autoAlpha
 * 0 -> 1, trigger top 85%, duration 0.8, power3.out. Kept deliberately plain
 * — this is the workhorse, not a place to get clever.
 */
export function FadeUp({ children, className, delay = 0, as = "div" }: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: 20, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.8,
          delay,
          ease: EASE.out,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay]);

  const Tag = as;
  return (
    <Tag ref={ref as never} className={className} style={{ opacity: 0 }}>
      {children}
    </Tag>
  );
}
