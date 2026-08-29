import type { ConsultationService } from "@/lib/consultations";
import { formatDateLabel } from "@/lib/bookingSlots";

export function BookingSummary({
  service,
  date,
  time,
}: {
  service: ConsultationService;
  date: Date;
  time: string;
}) {
  return (
    <div className="rounded-2xl p-6 md:p-8" style={{ background: "var(--surface)" }}>
      <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
        Your Booking
      </p>
      <h3 className="display-text text-xl mb-2">{service.name}</h3>
      <p className="opacity-70 mb-6">
        {formatDateLabel(date)} &middot; {time}
      </p>

      <div className="space-y-2 text-sm mb-6" style={{ borderTop: "1px solid rgba(245,241,232,0.1)", paddingTop: "1rem" }}>
        <div className="flex justify-between opacity-70">
          <span>Duration</span>
          <span>{service.durationLabel}</span>
        </div>
        <div className="flex justify-between opacity-70">
          <span>Meeting Type</span>
          <span>{service.meetingType}</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm opacity-70">Total</span>
        <span className="display-text text-2xl" style={{ color: "var(--orange)" }}>
          {service.price === 0 ? "Free" : `${service.price} ${service.currency}`}
        </span>
      </div>
    </div>
  );
}
