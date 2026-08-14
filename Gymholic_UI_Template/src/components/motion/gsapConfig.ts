"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

let registered = false;

/** Registers every GSAP plugin this build uses, exactly once. */
export function registerGsap() {
  if (registered) return gsap;
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, MotionPathPlugin);
  registered = true;
  return gsap;
}

export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  elastic: "elastic.out(1, 0.55)",
};

export { gsap, ScrollTrigger, SplitText, Flip, MotionPathPlugin };
