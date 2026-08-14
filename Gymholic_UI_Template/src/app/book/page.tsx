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

type Step = "service" | "datetime" | "details" | "payment" | "confirmation";

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

  async function createBooking() {
    if (!service || !date || !time) return;
    setBookingError(null);

    const res = await fetch("/api/bookings", {
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
      setBookingError(data.error || "That slot is no longer available. Please pick another time.");
      setTime(null);
      setStep("datetime");
      throw new Error(data.error);
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
