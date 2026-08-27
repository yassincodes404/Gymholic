import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { getConsultationService } from "@/lib/consultations";
import { slotKey } from "@/lib/bookingSlots";
import type { BookingDetails } from "@/components/booking/BookingDetailsForm";

type BookingBody = {
  serviceId: string;
  date: string; // YYYY-MM-DD
  dateLabel: string; // human-readable, for the email/response
  time: string;
  details: BookingDetails;
};

/**
 * The one place a slot actually gets locked. Called only after payment
 * succeeds — never on merely clicking a
 * time slot, per spec. `setIfNotExists` is the atomic check: if two people
 * raced for the same slot, only the first write wins and the second gets a
 * 409 here, telling the client to pick another time.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as BookingBody;
  const service = getConsultationService(body.serviceId);

  if (!service || !body.date || !body.time || !body.details?.email) {
    return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 });
  }

  const key = slotKey(body.date, body.time);
  const bookingRef = `GH-${Date.now().toString(36).toUpperCase()}`;

  // Slot claims expire at the end of the booked date so abandoned ones
  // self-clean instead of blocking the slot forever.
  const endOfBookedDate = Date.parse(`${body.date}T23:59:59Z`) + 1000;
  const ttlSeconds = Math.ceil((endOfBookedDate - Date.now()) / 1000);

  const claimed = await kv.setIfNotExists(key, bookingRef, ttlSeconds);
  if (!claimed && (await kv.get(key)) !== null) {
    return NextResponse.json(
      { error: "That time was just booked by someone else. Please pick another slot." },
      { status: 409 }
    );
  }

  const booking = {
    id: bookingRef,
    serviceId: service.id,
    serviceName: service.name,
    date: body.date,
    dateLabel: body.dateLabel,
    time: body.time,
    details: body.details,
    price: service.price,
    currency: service.currency,
    meetingType: service.meetingType,
    createdAt: new Date().toISOString(),
    reminderSent: false,
  };

  await kv.set(`booking:${bookingRef}`, booking);

  await sendBookingConfirmationEmail({
    to: body.details.email,
    name: body.details.fullName,
    serviceName: service.name,
    date: body.dateLabel,
    time: body.time,
    duration: service.durationLabel,
    meetingType: service.meetingType,
    price: `${service.price} ${service.currency}`,
    bookingRef,
  });

  return NextResponse.json({ bookingRef });
}
