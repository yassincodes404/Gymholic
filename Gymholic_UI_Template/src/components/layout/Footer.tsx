import { MagneticButton } from "@/components/motion/MagneticButton";

/** Marquee-driven wordmark footer — replaces gymholic-site's static outline-bleed wordmark. */
export function Footer() {
  const words = ["GYMHOLIC", "RETENTION", "GYMHOLIC", "STRATEGY", "GYMHOLIC", "GROWTH"];

  return (
    <footer className="section-dark pt-24 pb-10 overflow-hidden">
      <div className="marquee-row mb-16">
        {[...words, ...words].map((w, i) => (
          <span key={i} className="marquee-wordmark text-[14vw] md:text-[9vw] px-6">
            {w}
          </span>
        ))}
      </div>

      <div className="px-6 md:px-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <p className="text-sm opacity-60 max-w-sm">
            Gym business consulting for owners, operators, and investors —
            Egypt, the UAE, the GCC, and worldwide.
          </p>
        </div>
        <MagneticButton href="/book" className="btn-pill">
          Book a Call
        </MagneticButton>
      </div>

      <div className="px-6 md:px-10 mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs opacity-50">
        <span>© {new Date().getFullYear()} Gymholic. All rights reserved.</span>
        <span>Egypt · UAE · GCC · Worldwide</span>
      </div>
    </footer>
  );
}
