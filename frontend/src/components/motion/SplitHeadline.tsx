"use client";

import { useEffect, useRef } from "react";
import { registerGsap, gsap, ScrollTrigger, SplitText, EASE } from "./gsapConfig";

type SplitHeadlineProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Split by word (default, per brief 5.3) or char (short punchy lines only). */
  type?: "words" | "chars";
  /** If true, animates on mount instead of waiting for scroll (hero use). */
  onMount?: boolean;
};

export function SplitHeadline({
  text,
  className,
  as = "h2",
  type = "words",
  onMount = false,
}: SplitHeadlineProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerGsap();

    const ctx = gsap.context(() => {
      const split = new SplitText(el, {
        type,
        wordsClass: "split-word",
        charsClass: "split-char",
      });
      const targets = type === "words" ? split.words : split.chars;

      gsap.set(targets, { yPercent: 100, rotate: 3, transformOrigin: "0% 100%" });

      gsap.to(targets, {
        yPercent: 0,
        rotate: 0,
        duration: 0.9,
        stagger: 0.04,
        ease: EASE.out,
        scrollTrigger: onMount
          ? undefined
          : { trigger: el, start: "top 80%" },
      });

      return () => split.revert();
    }, el);

    return () => ctx.revert();
  }, [text, type, onMount]);

  const Tag = as;
  return (
    <Tag ref={ref as never} className={className} style={{ overflow: "hidden" }}>
      {text}
    </Tag>
  );
}
