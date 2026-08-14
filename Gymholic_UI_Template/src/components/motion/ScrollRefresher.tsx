"use client";

import { useEffect } from "react";
import { registerGsap, ScrollTrigger } from "./gsapConfig";

/**
 * Multiple components each create their own ScrollTrigger pin in their own
 * mount effect, measuring the page as it exists at that instant. Whichever
 * mounts first can cache a stale trigger position once later content (async
 * webfonts swapping in, later sections registering their own pins) shifts
 * the layout. One refresh after everything has settled resolves every
 * trigger against the final DOM in a single consistent pass.
 */
export function ScrollRefresher() {
  useEffect(() => {
    registerGsap();
    const refresh = () => ScrollTrigger.refresh();

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(refresh);
    });

    window.addEventListener("load", refresh);
    document.fonts?.ready?.then(refresh);
    const t = setTimeout(refresh, 1000);

    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener("load", refresh);
      clearTimeout(t);
    };
  }, []);

  return null;
}
