import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { MagneticButton } from "@/components/motion/MagneticButton";

/** Academy hero — same visual system as the homepage hero, no video (nothing to show yet pre-launch). */
export function AcademyHero() {
  return (
    <section
      id="top"
      className="section-dark min-h-[80vh] flex flex-col justify-center px-6 md:px-10 pt-32 pb-16"
    >
      <p className="text-sm tracking-widest uppercase mb-5" style={{ color: "var(--orange)" }}>
        Gymholic Academy
      </p>
      <SplitHeadline
        as="h1"
        onMount
        text="Learn How Great Gyms Actually Run."
        className="display-hero text-[11vw] md:text-[5.5vw] max-w-4xl"
      />
      <p className="mt-8 max-w-xl text-base md:text-lg opacity-70">
        A members-only learning platform for gym owners and operators.
        Courses, systems, videos, PDFs, and practical business education
        built from real gym experience.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <MagneticButton href="#waitlist" className="btn-pill">
          Join the Academy
        </MagneticButton>
        <a href="#coming-soon" className="btn-pill btn-pill--ghost">
          Coming Soon
        </a>
      </div>

      <p className="mt-5 text-sm opacity-50">Launching soon. Early members get first access.</p>
    </section>
  );
}
