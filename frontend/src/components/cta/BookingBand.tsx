import { MagneticButton } from "@/components/motion/MagneticButton";
import { SplitHeadline } from "@/components/motion/SplitHeadline";

/** Full-bleed black CTA band, magnetic pill CTA. */
export function BookingBand() {
  return (
    <section id="book" className="section-dark py-32 px-6 md:px-10 text-center">
      <SplitHeadline
        as="h2"
        text="Let's fix what's costing you members."
        className="display-hero text-4xl md:text-6xl max-w-3xl mx-auto mb-10"
      />
      <MagneticButton href="/book" className="btn-pill mx-auto">
        Book Your Session
      </MagneticButton>
    </section>
  );
}
