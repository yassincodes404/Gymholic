import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { sendBookingReminderEmail } from "@/lib/email";

type Booking = {
  id: string;
  serviceName: string;
  date: string;
  dateLabel: string;
  time: string;
  details: { fullName: string; email: string };
  reminderSent: boolean;
};

/**
 * Triggered by the Vercel Cron entry in vercel.json, once daily (09:00
 * UTC) — confirmed at deploy time that this account's Hobby plan rejects
 * any cron running more than once/day. Scans stored bookings for sessions
 * happening within the next 24 hours that haven't had a reminder sent yet.
 * Upgrading to Pro would allow a tighter schedule if once-daily ever turns
 * out to be too coarse for how far ahead people book.
 *
 * GET, not POST: Vercel Cron Jobs trigger scheduled routes with a GET
 * request, not POST.
 */
export async function GET() {
  const keys = await kv.keysWithPrefix("booking:");
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  let sent = 0;

  for (const key of keys) {
    const booking = await kv.get<Booking>(key);
    if (!booking || booking.reminderSent) continue;

    const sessionTime = new Date(`${booking.date} ${booking.time}`).getTime();
    if (Number.isNaN(sessionTime) || sessionTime < now || sessionTime > in24h) continue;

    await sendBookingReminderEmail({
      to: booking.details.email,
      name: booking.details.fullName,
      serviceName: booking.serviceName,
      date: booking.dateLabel,
      time: booking.time,
    });

    await kv.set(key, { ...booking, reminderSent: true });
    sent++;
  }

  return NextResponse.json({ scanned: keys.length, remindersSent: sent });
}
