"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { registerGsap, gsap } from "./gsapConfig";

type MagneticButtonProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  radius?: number;
};

/**
 * Primary CTA attraction (brief Section 6): mousemove + quickTo for perf,
 * elastic release. Disabled entirely under reduced-motion / touch — magnetic
 * pull is a mouse-precision affordance, not a touch one.
 */
export function MagneticButton({
  children,
  className,
  onClick,
  href,
  radius = 70,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    registerGsap();
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
    const scaleTo = gsap.quickTo(el, "scale", { duration: 0.15, ease: "power2" });

    const handleMove = (e: MouseEvent<HTMLElement> | globalThis.MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(relX, relY);
      const strength = Math.max(0, 1 - dist / (rect.width / 2 + radius));
      xTo(relX * strength * 0.4);
      yTo(relY * strength * 0.4);
    };

    const handleLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
    };

    // Apple Design skill §1 — respond on pointer-down, not release. Press
    // feedback fires the instant the button is grabbed.
    const handleDown = () => scaleTo(0.94);
    const handleUp = () => scaleTo(1);

    window.addEventListener("mousemove", handleMove as EventListener);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("pointerdown", handleDown);
    el.addEventListener("pointerup", handleUp);
    el.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove as EventListener);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("pointerdown", handleDown);
      el.removeEventListener("pointerup", handleUp);
      el.removeEventListener("pointercancel", handleUp);
    };
  }, [radius]);

  if (href) {
    return (
      <a ref={ref as never} href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button ref={ref as never} onClick={onClick} className={className} type="button">
      {children}
    </button>
  );
}
