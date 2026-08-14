import { SplitHeadline } from "@/components/motion/SplitHeadline";

/** Clean, product-forward hero — deliberately restrained, per the brief's own instruction to avoid excess marketing copy here. */
export function BlueprintsHero() {
  return (
    <section id="top" className="section-dark pt-32 pb-16 px-6 md:px-10">
      <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
        Gymholic Blueprints
      </p>
      <SplitHeadline
        as="h1"
        onMount
        text="Run Your Gym With A System."
        className="display-hero text-[10vw] md:text-[4.5vw] max-w-3xl"
      />
      <p className="mt-6 max-w-lg text-base md:text-lg opacity-70">
        Practical systems, templates and operational playbooks built from real gym operations.
      </p>
    </section>
  );
}
