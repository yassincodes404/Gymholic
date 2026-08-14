"use client";

import { useEffect, type RefObject } from "react";
import { registerGsap, gsap } from "./gsapConfig";

/**
 * CSS 3D perspective tilt, tuned per the Apple Design skill's motion model:
 * tight, near-1:1 tracking while the cursor moves (Response — no lag on
 * direct manipulation), then a springy, slightly-overshooting release on
 * leave (Behavior over animation — momentum only on the "let go" moment,
 * not the tracking itself). Pairs with `.tilt-glare` / `.tilt-shadow` in
 * globals.css for the cursor-tracked glare sweep and dynamic shadow.
 *
 * Applied to every card in the site. Disabled under reduced-motion, touch
 * (no hover), and while `enabled` is false (e.g. a service card mid-Flip).
 */
export function useTilt(
  ref: RefObject<HTMLElement | null>,
  { maxTilt = 12, enabled = true }: { maxTilt?: number; enabled?: boolean } = {}
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    registerGsap();
    const parent = el.parentElement;
    const prevParentPerspective = parent?.style.perspective ?? "";
    // A larger perspective (vs. the old 1400px) means less foreshortening
    // per degree of rotation. The old, tighter perspective + large tilt
    // angles made a rotated card's near edge visually bulge past its own
    // rounded-corner clip — on cards flush against the page edge, that
    // bulge got cut off by the site's overflow-x: hidden, reading as a
    // "glitch" (text sheared off mid-word on hover).
    if (parent) parent.style.perspective = "2200px";
    el.style.transformStyle = "preserve-3d";
    el.style.willChange = "transform";
    el.style.backfaceVisibility = "hidden";
    el.setAttribute("data-tilting", "false");
    el.style.setProperty("--glare-opacity", "0");

    // Tight tracking while the cursor moves — direct manipulation, no lag.
    const rotateX = gsap.quickTo(el, "rotationX", { duration: 0.3, ease: "power2" });
    const rotateY = gsap.quickTo(el, "rotationY", { duration: 0.3, ease: "power2" });
    const lift = gsap.quickTo(el, "z", { duration: 0.3, ease: "power2" });
    const scale = gsap.quickTo(el, "scale", { duration: 0.3, ease: "power2" });
    const rotateZ = gsap.quickTo(el, "rotationZ", { duration: 0.3, ease: "power2" });

    // Separate quickTo setters (elastic ease) for the release, reusing the
    // same GSAP-managed tween-per-property mechanism as the tracking
    // setters above — mixing quickTo with a plain .to() on the same
    // property is what caused GSAP's "not eligible for reset" warning.
    const releaseX = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const releaseY = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const releaseZ = gsap.quickTo(el, "rotationZ", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const releaseLift = gsap.quickTo(el, "z", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const releaseScale = gsap.quickTo(el, "scale", { duration: 0.8, ease: "elastic.out(1, 0.4)" });

    const handleEnter = () => {
      el.setAttribute("data-tilting", "true");
      el.style.setProperty("--glare-opacity", "1");
    };

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const cx = px - 0.5;
      const cy = py - 0.5;

      rotateY(cx * maxTilt * 2);
      rotateX(-cy * maxTilt * 2);
      rotateZ(cx * cy * -3);
      lift(30);
      scale(1.03);

      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    };

    // Springy overshoot release — the one moment this tilt is allowed to
    // bounce, since it's the "let go" of the gesture, not the tracking.
    const handleLeave = () => {
      el.setAttribute("data-tilting", "false");
      el.style.setProperty("--glare-opacity", "0");
      releaseX(0);
      releaseY(0);
      releaseZ(0);
      releaseLift(0);
      releaseScale(1);
    };

    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      gsap.set(el, { rotationX: 0, rotationY: 0, rotationZ: 0, z: 0, scale: 1 });
      el.removeAttribute("data-tilting");
      if (parent) parent.style.perspective = prevParentPerspective;
    };
  }, [ref, maxTilt, enabled]);
}
