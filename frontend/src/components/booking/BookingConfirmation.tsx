import Link from "next/link";
import type { ConsultationService } from "@/lib/consultations";
import { formatDateLabel } from "@/lib/bookingSlots";

function parseTimeToDate(baseDate: Date, timeLabel: string): Date {
  const match = timeLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
  const result = new Date(baseDate);
  if (!match) return result;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === "PM";
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function durationMinutes(label: string): number {
  const match = label.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 45;
}

function sessionTimes(service: ConsultationService, date: Date, time: string) {
  const start = parseTimeToDate(date, time);
  const end = new Date(start.getTime() + durationMinutes(service.durationLabel) * 60000);
  return { start, end };
}

/**
 * Opens the client's own Google Calendar with the session prefilled — they
 * review and click save. (Google only allows programmatic writes to
 * calendars the account owns, so a template link is the correct way to add
 * an event to the client's calendar.)
 */
function googleCalendarUrl(
  service: ConsultationService,
  date: Date,
  time: string,
  bookingRef: string,
  meetLink?: string | null
): string {
  const { start, end } = sessionTimes(service, date, time);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${service.name} — Gymholic`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details:
      `${service.meetingType} consultation with Gymholic. Booking reference ${bookingRef}.` +
      (meetLink ? ` Join: ${meetLink}` : ""),
    ...(meetLink ? { location: meetLink } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICS(service: ConsultationService, date: Date, time: string, bookingRef: string) {
  const { start, end } = sessionTimes(service, date, time);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gymholic//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${bookingRef}@gymholic`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${service.name} — Gymholic`,
    `DESCRIPTION:${service.meetingType} consultation with Gymholic. Booking reference ${bookingRef}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gymholic-session.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingConfirmation({
  service,
  date,
  time,
  bookingRef,
  meetLink,
  status,
}: {
  service: ConsultationService;
  date: Date;
  time: string;
  bookingRef: string;
  meetLink?: string | null;
  status?: string | null;
}) {
  return (
    <div className="text-center">
      <h1 className="display-hero text-4xl md:text-6xl mb-4">You&apos;re Booked.</h1>
      <p className="opacity-70 max-w-md mx-auto mb-12">Your session with Gymholic has been confirmed.</p>

      <div className="max-w-md mx-auto rounded-2xl p-8 text-left mb-8" style={{ background: "var(--surface)" }}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between opacity-70">
            <span>Consultation Type</span>
            <span>{service.name}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Date</span>
            <span>{formatDateLabel(date)}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Time</span>
            <span>{time}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Duration</span>
            <span>{service.durationLabel}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Type</span>
            <span>{service.meetingType}</span>
          </div>
          <div className="flex justify-between font-medium pt-2" style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}>
            <span>Booking Reference</span>
            <span>{bookingRef}</span>
          </div>
          {status && (
            <div className="flex justify-between pt-2">
              <span>Status</span>
              <span>{status}</span>
            </div>
          )}
        </div>
      </div>

      {meetLink && (
        <div className="max-w-md mx-auto mb-8">
          <a href={meetLink} target="_blank" rel="noreferrer" className="btn-pill inline-block">
            Join Google Meet
          </a>
        </div>
      )}

      <p className="text-sm opacity-60 mb-1">Confirmation sent to your email.</p>
      <p className="text-sm opacity-60 mb-10">
        {service.meetingType === "Online"
          ? "Meeting details and the call link will be sent to your email."
          : "Meeting location and instructions will be sent to your email."}
      </p>

      <div className="flex flex-col items-center gap-4">
        <a
          href={googleCalendarUrl(service, date, time, bookingRef, meetLink)}
          target="_blank"
          rel="noreferrer"
          className="btn-pill"
        >
          Add to Google Calendar
        </a>
        <button
          type="button"
          onClick={() => downloadICS(service, date, time, bookingRef)}
          className="text-xs opacity-50 underline hover:no-underline hover:opacity-80"
        >
          Using another calendar? Download the invite (.ics)
        </button>
      </div>
      <div className="mt-6">
        <Link href="/" className="btn-pill btn-pill--ghost">
          Back to Gymholic
        </Link>
      </div>
    </div>
  );
}
