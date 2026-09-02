import type { ConsultationService } from "@/lib/consultations";
import { IconLock, IconMail, IconCalendar } from "@/components/account/icons";
import { formatDateLabel } from "@/lib/bookingSlots";

/** Order-summary card shared by the details and payment steps: what you
 *  booked, when, and what you pay — checkout style. */
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
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
    >
      <div
        className="px-6 md:px-8 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(245,241,232,0.1)" }}
      >
        <p className="text-xs tracking-widest uppercase" style={{ color: "var(--orange)" }}>
          Order Summary
        </p>
        <span className="text-xs opacity-50">1 item</span>
      </div>

      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="display-text text-lg leading-snug">{service.name}</h3>
          <span className="display-text text-lg whitespace-nowrap">
            {service.price} {service.currency}
          </span>
        </div>
        <p className="text-sm opacity-60 mb-6">
          {formatDateLabel(date)} &middot; {time}
        </p>

        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between opacity-70">
            <span>Session fee</span>
            <span>
              {service.price} {service.currency}
            </span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Duration</span>
            <span>{service.durationLabel}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Meeting type</span>
            <span>{service.meetingType}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Google Meet link</span>
            <span>Included</span>
          </div>
        </div>

        <div
          className="flex justify-between items-center pt-4"
          style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}
        >
          <span className="text-sm uppercase tracking-widest opacity-70">Total</span>
          <span className="display-text text-2xl" style={{ color: "var(--orange)" }}>
            {service.price} {service.currency}
          </span>
        </div>

        <div
          className="mt-6 pt-4 space-y-2.5 text-xs opacity-70"
          style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}
        >
          <p className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: "var(--orange)" }}><IconLock width={13} height={13} /></span>
            Secure checkout — card details are encrypted and never touch our servers.
          </p>
          <p className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: "var(--orange)" }}><IconMail width={13} height={13} /></span>
            Confirmation email with your receipt and Meet link, right after payment.
          </p>
          <p className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: "var(--orange)" }}><IconCalendar width={13} height={13} /></span>
            Free rescheduling up to 24 hours before your session.
          </p>
        </div>
      </div>
    </div>
  );
}
