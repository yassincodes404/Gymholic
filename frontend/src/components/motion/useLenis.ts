"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger, gsap } from "./gsapConfig";

/** Global smooth-scroll wrapper, synced to ScrollTrigger per the brief's Section 2. */
export function useLenis() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    // Lenis only fires "scroll" for motion it drives itself. Anything that
    // moves the page without going through Lenis (browser autoscroll,
    // in-page anchor jumps, programmatic scrollTo) needs ScrollTrigger
    // synced independently, so also update it every tick.
    const raf = (time: number) => {
      lenis.raf(time * 1000);
      ScrollTrigger.update();
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Lenis owns scroll now, so the browser's native "land on #hash on
    // load" behavior can't reliably position the page anymore — it either
    // fires before Lenis takes over, or before pinned sections' spacer
    // heights exist yet, landing short of the real target (confirmed: a
    // "/#book" link was landing ~3000px above the actual section). Redo
    // the jump ourselves once layout has settled, the same multi-signal
    // wait ScrollRefresher uses for ScrollTrigger's own refresh.
    const HEADER_OFFSET = -90;
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const target = document.querySelector(hash);
      if (target) lenis.scrollTo(target as HTMLElement, { offset: HEADER_OFFSET, immediate: true });
    };

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToHash);
    });
    window.addEventListener("load", scrollToHash);
    document.fonts?.ready?.then(scrollToHash);
    const settleTimeout = setTimeout(scrollToHash, 1000);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      cancelAnimationFrame(raf1);
      window.removeEventListener("load", scrollToHash);
      clearTimeout(settleTimeout);
    };
  }, []);
}
