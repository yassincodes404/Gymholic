"use client";

import { useEffect, useRef, useState } from "react";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { MagneticButton } from "@/components/motion/MagneticButton";

/**
 * Hero video — large, bleeding off the right edge on desktop, stacked
 * below the headline on mobile. Loops forever. `prefers-reduced-motion`
 * shows the static poster frame instead of looping.
 *
 * Playback is triggered imperatively (`video.play()`), not via the
 * `autoPlay` attribute: the attribute's value is only evaluated once, at
 * element creation, and this component's first paint can race the real
 * `matchMedia` check — flipping the attribute afterward doesn't
 * retroactively start playback in any browser. Play is attempted from
 * three places (mount effect, `loadeddata`, `canplay`) since the exact
 * point a video becomes play()-able varies across browsers/cache states;
 * each call is a harmless no-op if playback already started.
 *
 * Note: the desktop source is natively 4:3 (2224x1668), not 16:9 — the box
 * is sized to that real aspect ratio so `object-fit: contain` doesn't
 * letterbox unnecessarily.
 */
function HeroVideo() {
  // Both values must start identical on server and client to avoid hydration
  // mismatches; the real media-query state is applied after mount.
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 768px)");
    const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsMobile(mobileMq.matches);
    setReduceMotion(reduceMotionMq.matches);
    const mobileListener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const reduceMotionListener = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mobileMq.addEventListener("change", mobileListener);
    reduceMotionMq.addEventListener("change", reduceMotionListener);

    return () => {
      mobileMq.removeEventListener("change", mobileListener);
      reduceMotionMq.removeEventListener("change", reduceMotionListener);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return;

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay can still be blocked by the browser even when muted;
        // the poster frame is an acceptable fallback in that case.
      });
    };

    tryPlay();
    video.addEventListener("loadeddata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    return () => {
      video.removeEventListener("loadeddata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
    };
  }, [reduceMotion, isMobile]);

  return (
    <div className="hero-video-wrap">
      <video
        key={isMobile ? "mobile" : "desktop"}
        ref={videoRef}
        className="hero-video"
        src={isMobile ? "/hero/gymholic-hero-9x16.mp4" : "/hero/gymholic-hero-16x9.mp4"}
        poster={isMobile ? "/hero/poster-9x16.jpg" : "/hero/poster-16x9.jpg"}
        muted
        loop
        playsInline
        preload="auto"
      />
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="section-dark relative min-h-[92vh] flex flex-col justify-center px-6 md:px-10 pt-28 pb-16"
    >
      <div className="relative z-10 max-w-2xl">
        <SplitHeadline
          as="h1"
          onMount
          text="Turn your gym into a retention machine."
          className="display-hero text-[12vw] md:text-[4.5vw] max-w-xl"
        />
        <p className="mt-8 max-w-xl text-base md:text-lg opacity-70">
          Gymholic is a gym business consultancy for owners, operators, and
          investors — Egypt, the UAE, the GCC, and worldwide.
        </p>
        <div className="mt-10">
          <MagneticButton href="/book" className="btn-pill">
            Book a Call
          </MagneticButton>
        </div>
      </div>

      <HeroVideo />
    </section>
  );
}
