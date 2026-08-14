import { whyGymholic } from "@/lib/content";

/** Infinite marquee of differentiators — loops, pauses on hover (CSS-only, no JS timer). */
export function Marquee() {
  const items = [...whyGymholic, ...whyGymholic];

  return (
    <section className="section-light py-20 overflow-hidden">
      <div className="marquee-row items-center">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-8 px-8">
            <span className="display-text text-2xl md:text-4xl whitespace-nowrap">{item}</span>
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--orange)" }} />
          </span>
        ))}
      </div>
    </section>
  );
}
