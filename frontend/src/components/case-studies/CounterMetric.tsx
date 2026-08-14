"use client";

import { useEffect, useRef, useState } from "react";
import { registerGsap, gsap, ScrollTrigger } from "@/components/motion/gsapConfig";

type CounterMetricProps = {
  from?: number;
  to: number;
  suffix?: string;
  className?: string;
};

/**
 * Count-up on scroll-into-view. Reserved ONLY for the two verified
 * case-study numbers per the brief — never used on generic marketing copy.
 */
export function CounterMetric({ from = 0, to, suffix = "", className }: CounterMetricProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(from);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerGsap();

    const counter = { val: from };
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        val: to,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
        onUpdate: () => setValue(Math.round(counter.val)),
      });
    }, el);

    return () => ctx.revert();
  }, [from, to]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}
