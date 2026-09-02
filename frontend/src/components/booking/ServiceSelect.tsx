"use client";

import { consultationServices, type ConsultationService } from "@/lib/consultations";
import { IconClock, IconVideo, IconPin, IconArrowRight } from "@/components/account/icons";

/*!
 * Book Your Session — the entry cards of the booking flow. Each card lifts
 * with an orange edge on hover (the blueprint-card language), presses down
 * on click, and its CTA fills orange with a nudging arrow. Cards rise in
 * with a slight stagger so the step feels alive from the first paint.
 */
export function ServiceSelect({
  services = consultationServices,
  onSelect,
}: {
  services?: ConsultationService[];
  onSelect: (service: ConsultationService) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--orange)" }}>
        Step 01 — Choose your session
      </p>
      <h1 className="display-hero text-4xl md:text-6xl mb-4">Book Your Session</h1>
      <p className="opacity-70 max-w-lg mb-12">Choose the type of session that fits what you need.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((service, i) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className="service-card booking-rise text-left rounded-2xl p-6 flex flex-col"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(245,241,232,0.1)",
              animationDelay: `${i * 70}ms`,
            }}
          >
            <div className="flex flex-wrap gap-2 mb-5">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: "rgba(245,241,232,0.06)", color: "var(--paper)" }}
              >
                <IconClock width={12} height={12} />
                {service.durationLabel}
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,106,0,0.10)", color: "var(--orange)" }}
              >
                {service.meetingType.toLowerCase().includes("person") ? <IconPin width={12} height={12} /> : <IconVideo width={12} height={12} />}
                {service.meetingType}
              </span>
            </div>
            <h3 className="display-text text-xl mb-3">{service.name}</h3>
            <p className="text-sm opacity-70 mb-6 flex-1">{service.description}</p>
            <p className="display-text text-2xl mb-5" style={{ color: "var(--orange)" }}>
              {service.price} {service.currency}
            </p>
            <span className="service-card-cta w-fit">
              {service.cta}
              <span className="service-card-arrow" aria-hidden>
                <IconArrowRight width={14} height={14} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
