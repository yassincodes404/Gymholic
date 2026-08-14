"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ServiceSelect } from "@/components/booking/ServiceSelect";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { BookingDetailsForm, emptyBookingDetails, type BookingDetails } from "@/components/booking/BookingDetailsForm";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import type { ConsultationService } from "@/lib/consultations";
import { dateKey, formatDateLabel } from "@/lib/bookingSlots";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";
import {
  buildBackendApiUrl,
  getClientTimezone,
  getFrontendApiPath,
  getStoredAuthToken,
  toTemplateTimeLabel,
} from "@/lib/api";

type Step = "service" | "datetime" | "details" | "payment" | "confirmation";
type BackendAvailableSlot = {
  startTime: string;
  endTime: string;
  displayTime: string;
};

const DEFAULT_TRAINER_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_TRAINER_ID ?? "1");

class BookingFlowError extends Error {
  allowFrontendFallback: boolean;

  constructor(message: string, allowFrontendFallback = false) {
    super(message);
    this.name = "BookingFlowError";
    this.allowFrontendFallback = allowFrontendFallback;
  }
}

function extractErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const candidate = data as { error?: string; message?: string };
  return candidate.message || candidate.error || fallback;
}

function buildBookingNotes(service: ConsultationService, details: BookingDetails) {
  return [
    `Service: ${service.name}`,
    `Topic: ${details.topic}`,
    details.phone ? `Phone: ${details.phone}` : null,
    details.whatsapp ? `WhatsApp: ${details.whatsapp}` : null,
    details.company ? `Company: ${details.company}` : null,
    details.country ? `Country: ${details.country}` : null,
    details.message ? `Message: ${details.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function BookPage() {
  useLenis();

  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<ConsultationService | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [details, setDetails] = useState<BookingDetails>(emptyBookingDetails);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const stepOrder: Step[] =
    service?.isFree ? ["service", "datetime", "details", "confirmation"] : ["service", "datetime", "details", "payment", "confirmation"];
  const currentIndex = stepOrder.indexOf(step);

  async function tryCreateBackendBooking(selectedService: ConsultationService, selectedDate: Date, selectedTime: string) {
    const token = getStoredAuthToken();

    if (!token) {
      throw new BookingFlowError("Backend booking requires a signed-in Gymholic user session.", true);
    }

    const clientTimezone = getClientTimezone();
    const query = new URLSearchParams({
      date: dateKey(selectedDate),
      clientTimezone,
    });

    const availabilityResponse = await fetch(
      `${buildBackendApiUrl(`/availability/trainer/${DEFAULT_TRAINER_ID}/slots`)}?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const availabilityData = await availabilityResponse.json().catch(() => null);

    if (!availabilityResponse.ok) {
      throw new BookingFlowError(
        extractErrorMessage(availabilityData, "Could not load live availability from the backend."),
        [401, 403, 404].includes(availabilityResponse.status)
      );
    }

    const slots = Array.isArray((availabilityData as { data?: BackendAvailableSlot[] } | null)?.data)
      ? ((availabilityData as { data: BackendAvailableSlot[] }).data)
      : [];

    const matchingSlot = slots.find((slot) => toTemplateTimeLabel(slot.displayTime) === selectedTime);

    if (!matchingSlot) {
      throw new BookingFlowError("That time is no longer available in the backend. Please choose another slot.");
    }

    const bookingResponse = await fetch(buildBackendApiUrl("/bookings"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        trainerId: DEFAULT_TRAINER_ID,
        startTime: matchingSlot.startTime,
        endTime: matchingSlot.endTime,
        clientTimezone,
        notes: buildBookingNotes(selectedService, details),
      }),
    });

    const bookingData = await bookingResponse.json().catch(() => null);

    if (!bookingResponse.ok) {
      throw new BookingFlowError(
        extractErrorMessage(bookingData, "The backend rejected this booking."),
        [401, 403, 404].includes(bookingResponse.status)
      );
    }

    const createdBooking = (bookingData as { data?: { id?: number | string } } | null)?.data;
    return createdBooking?.id ? `BK-${createdBooking.id}` : `BK-${Date.now()}`;
  }

  async function createBooking() {
    if (!service || !date || !time) return;
    setBookingError(null);

    try {
      const backendBookingRef = await tryCreateBackendBooking(service, date, time);
      setBookingRef(backendBookingRef);
      setStep("confirmation");
      return;
    } catch (error) {
      if (!(error instanceof BookingFlowError) || !error.allowFrontendFallback) {
        const message = error instanceof Error ? error.message : "That slot is no longer available. Please pick another time.";
        setBookingError(message);
        setTime(null);
        setStep("datetime");
        throw error;
      }
    }

    const res = await fetch(getFrontendApiPath("/bookings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        date: dateKey(date),
        dateLabel: formatDateLabel(date),
        time,
        details,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setBookingError(extractErrorMessage(data, "That slot is no longer available. Please pick another time."));
      setTime(null);
      setStep("datetime");
      throw new Error(extractErrorMessage(data, "Booking failed."));
    }

    setBookingRef(data.bookingRef);
    setStep("confirmation");
  }

  const detailsValid =
    details.fullName.trim() && details.email.trim() && details.phone.trim() && details.country.trim() && details.topic.trim();

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <div className="max-w-4xl">
          {step !== "service" && <BookingProgress currentIndex={currentIndex} isFree={!!service?.isFree} />}

          {bookingError && step === "datetime" && (
            <p className="text-sm mb-6" style={{ color: "var(--orange)" }}>
              {bookingError}
            </p>
          )}

          {step === "service" && (
            <ServiceSelect
              onSelect={(s) => {
                setService(s);
                setStep("datetime");
              }}
            />
          )}

          {step === "datetime" && service && (
            <div className="grid md:grid-cols-2 gap-12">
              <BookingCalendar selectedDate={date} onSelectDate={(d) => { setDate(d); setTime(null); }} onAvailabilityForDate={setBookedTimes} />
              <div>
                {date ? (
                  <>
                    <TimeSlotPicker bookedTimes={bookedTimes} selectedTime={time} onSelect={setTime} />
                    {time && (
                      <button type="button" onClick={() => setStep("details")} className="btn-pill mt-8">
                        Continue
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm opacity-40">Select a date to see available times.</p>
                )}
              </div>
            </div>
          )}

          {step === "details" && service && date && time && (
            <div className="grid md:grid-cols-2 gap-12">
              <BookingDetailsForm values={details} onChange={setDetails} />
              <div className="space-y-6">
                <BookingSummary service={service} date={date} time={time} />
                {detailsValid ? (
                  <button
                    type="button"
                    className="btn-pill w-full justify-center"
                    onClick={() => (service.isFree ? createBooking().catch(() => {}) : setStep("payment"))}
                  >
                    {service.isFree ? "Confirm Free Booking" : "Continue to Payment"}
                  </button>
                ) : (
                  <p className="text-sm opacity-40">Fill in your details to continue.</p>
                )}
              </div>
            </div>
          )}

          {step === "payment" && service && date && time && (
            <div className="grid md:grid-cols-2 gap-12">
              <PaymentForm
                amountLabel={`${service.price} ${service.currency}`}
                submitLabel="Pay & Confirm Booking"
                showWallets
                onSuccess={createBooking}
              />
              <BookingSummary service={service} date={date} time={time} />
            </div>
          )}

          {step === "confirmation" && service && date && time && bookingRef && (
            <BookingConfirmation service={service} date={date} time={time} bookingRef={bookingRef} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
