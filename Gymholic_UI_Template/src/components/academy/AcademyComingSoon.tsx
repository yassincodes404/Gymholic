/** Elegant coming-soon status strip — a live-launch-prep indicator, not an empty state. */
export function AcademyComingSoon() {
  return (
    <section id="coming-soon" className="section-dark py-16 px-6 md:px-10">
      <div
        className="max-w-3xl mx-auto flex items-center gap-4 rounded-full px-6 py-4"
        style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.25)" }}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span
            className="coming-soon-pulse absolute inline-flex h-full w-full rounded-full"
            style={{ background: "var(--orange)" }}
          />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--orange)" }} />
        </span>
        <p className="text-sm md:text-base">
          <span className="font-semibold" style={{ color: "var(--orange)" }}>
            Coming Soon
          </span>{" "}
          — Gymholic Academy is preparing its first learning system.
        </p>
      </div>
    </section>
  );
}
