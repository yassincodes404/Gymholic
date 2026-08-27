"use client";

import { useEffect, useState } from "react";
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
import { TermsAcceptance } from "@/components/checkout/TermsAcceptance";
import type { ConsultationService } from "@/lib/consultations";
import { consultationServices } from "@/lib/consultations";
import { applyPricing, fetchBookingPricing } from "@/lib/pricing";
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

// Used only if the backend can't tell us which expert owns the working hours.
const FALLBACK_TRAINER_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_TRAINER_ID ?? "1");

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
  const [services, setServices] = useState<ConsultationService[]>(consultationServices);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  // Live backend availability (signed-in flow): the expert's real open slots
  // for the selected date replace the template's fixed time list.
  const [backendMode, setBackendMode] = useState<boolean | null>(null);
  const [backendSlots, setBackendSlots] = useState<BackendAvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [details, setDetails] = useState<BookingDetails>(emptyBookingDetails);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedMeetLink, setConfirmedMeetLink] = useState<string | null>(null);
  const [confirmedStatus, setConfirmedStatus] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"paymob" | "mock" | "none" | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Embedded Paymob checkout: instead of leaving the site, the Unified
  // Checkout renders inside the payment card until Paymob redirects the
  // frame back to /payment-status, which notifies this page via postMessage.
  const [embeddedCheckoutUrl, setEmbeddedCheckoutUrl] = useState<string | null>(null);
  const [embeddedBookingId, setEmbeddedBookingId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Which gateway checkout should use ("paymob" when enabled in Admin →
  // Integrations, "mock" in dev). Public endpoint.
  useEffect(() => {
    let cancelled = false;
    fetch(buildBackendApiUrl("payments/active-provider"))
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        if (!cancelled) setActiveProvider(payload?.data?.provider ?? "none");
      })
      .catch(() => {
        if (!cancelled) setActiveProvider("none");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live prices from the backend (admin-managed); falls back to catalogue defaults.
  useEffect(() => {
    let cancelled = false;
    fetchBookingPricing().then((pricing) => {
      if (!cancelled && pricing) setServices(applyPricing(consultationServices, pricing));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stepOrder: Step[] = ["service", "datetime", "details", "payment", "confirmation"];
  const currentIndex = stepOrder.indexOf(step);

  // The real slot list requires an authenticated session; guests keep the
  // template KV flow.
  useEffect(() => {
    setBackendMode(!!getStoredAuthToken());
  }, []);

  // Which expert we book against is resolved server-side (owner of the
  // current working hours), so the admin's schedule and this page can never
  // drift apart. Falls back to the configured default id if resolution fails.
  const [trainerId, setTrainerId] = useState<number | null>(null);
  useEffect(() => {
    if (backendMode !== true) return;
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    fetch(buildBackendApiUrl("availability/booking-trainer"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.success) throw new Error("trainer resolution failed");
        return (payload.data as { trainerId?: number | string }).trainerId;
      })
      .then((id) => {
        if (!cancelled) setTrainerId(Number(id) || FALLBACK_TRAINER_ID);
      })
      .catch(() => {
        if (!cancelled) setTrainerId(FALLBACK_TRAINER_ID);
      });
    return () => {
      cancelled = true;
    };
  }, [backendMode]);

  // Load the backend's real open slots whenever a date is picked (and again
  // whenever the datetime step is re-entered, e.g. after a failed payment).
  useEffect(() => {
    if (!date || backendMode !== true || step !== "datetime" || !trainerId) return;
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    const query = new URLSearchParams({
      date: dateKey(date),
      clientTimezone: getClientTimezone(),
    });
    fetch(`${buildBackendApiUrl(`/availability/trainer/${trainerId}/slots`)}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (availabilityResponse) => {
        const availabilityData = await availabilityResponse.json().catch(() => null);
        if (!availabilityResponse.ok) {
          throw new Error(
            extractErrorMessage(availabilityData, "Could not load live availability from the backend.")
          );
        }
        return Array.isArray((availabilityData as { data?: BackendAvailableSlot[] } | null)?.data)
          ? (availabilityData as { data: BackendAvailableSlot[] }).data
          : [];
      })
      .then((slots) => {
        if (!cancelled) setBackendSlots(slots);
      })
      .catch((e) => {
        if (!cancelled) {
          setBackendSlots([]);
          setSlotsError(e instanceof Error ? e.message : "Could not load live availability.");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, backendMode, step, trainerId]);

  const backendSlotLabels = [...new Set(backendSlots.map((slot) => toTemplateTimeLabel(slot.displayTime)))];

  // Embedded Paymob checkout finisher: the /payment-status page reports the
  // outcome from inside the iframe, then we poll the booking until the
  // webhook confirms it (or timeout with a pending note — prod confirms in
  // seconds; local dev needs the simulated webhook).
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; url?: string } | null;
      if (!data || data.type !== "paymob-embedded-done" || !data.url) return;

      const outcome = new URL(data.url, window.location.origin).searchParams;
      const paid = outcome.get("success") === "true" || outcome.get("pending") === "true";
      setEmbeddedCheckoutUrl(null);
      setEmbeddedBookingId((bookingId) => {
        if (paid && bookingId) {
          void waitForBookingConfirmation(bookingId);
        } else {
          setBookingError("The payment didn't go through — no money was taken. You can try again.");
          setTime(null);
          setStep("datetime");
        }
        return null;
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function waitForBookingConfirmation(bookingId: number) {
    const token = getStoredAuthToken();
    setConfirming(true);
    try {
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const res = await fetch(buildBackendApiUrl(`bookings/${bookingId}`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const payload = await res.json().catch(() => null);
          if (res.ok && payload?.data) {
            const status = payload.data.status as string | null;
            if (status === "CONFIRMED" || status === "COMPLETED") {
              setConfirmedStatus(status);
              setConfirmedMeetLink(payload.data.meetLink ?? null);
              setBookingRef(`BK-${bookingId}`);
              setStep("confirmation");
              return;
            }
          }
        } catch {
          // transient network hiccup — keep polling
        }
      }
      // Webhook hasn't landed within ~45s (expected in local dev where
      // Paymob can't reach the backend). Show the confirmation with the
      // pending note instead of blocking the user forever.
      setConfirmedStatus("PENDING_PAYMENT_CONFIRMATION");
      setBookingRef(`BK-${bookingId}`);
      setStep("confirmation");
    } finally {
      setConfirming(false);
    }
  }

  async function tryCreateBackendBooking(selectedService: ConsultationService, selectedDate: Date, selectedTime: string) {
    const token = getStoredAuthToken();

    if (!token) {
      throw new BookingFlowError("Backend booking requires a signed-in Gymholic user session.", true);
    }

    const clientTimezone = getClientTimezone();
    const effectiveTrainerId = trainerId ?? FALLBACK_TRAINER_ID;
    const query = new URLSearchParams({
      date: dateKey(selectedDate),
      clientTimezone,
    });

    const availabilityResponse = await fetch(
      `${buildBackendApiUrl(`/availability/trainer/${effectiveTrainerId}/slots`)}?${query.toString()}`,
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
        trainerId: effectiveTrainerId,
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
    return createdBooking?.id ? Number(createdBooking.id) : null;
  }

  /**
   * Paid booking flow. Provider "paymob": create the booking + payment on
   * the backend, then redirect to Paymob's hosted card checkout — the
   * webhook confirms the booking after a successful payment. Provider
   * "mock" (dev): create + complete the test payment inline, which runs
   * the full payment → confirmation → Calendar/Meet → email pipeline.
   */
  async function runBackendPaidBookingFlow(provider: "paymob" | "mock") {
    if (!service || !date || !time) return;
    setPaying(true);
    setBookingError(null);
    try {
      const bookingId = await tryCreateBackendBooking(service, date, time);
      if (!bookingId) {
        throw new BookingFlowError("The backend rejected this booking.", false);
      }

      const token = getStoredAuthToken();
      const paymentResponse = await fetch(buildBackendApiUrl("payments"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          amount: service.price,
          currency: service.currency,
          provider,
        }),
      });
      const paymentData = await paymentResponse.json().catch(() => null);
      if (!paymentResponse.ok || !paymentData?.data?.id) {
        throw new BookingFlowError(
          extractErrorMessage(paymentData, "Could not create the payment."),
          false
        );
      }

      if (provider === "paymob") {
        const checkoutUrl = paymentData.data.checkoutUrl as string | undefined;
        if (!checkoutUrl) {
          throw new BookingFlowError("Paymob checkout could not be started.", false);
        }
        // Embedded checkout: keep the user on this page and mount Paymob's
        // hosted checkout in an iframe. Paymob's post-payment redirect
        // targets our own /payment-status inside the frame, which notifies
        // this page via postMessage (listener below). The webhook confirms
        // the booking server-side either way.
        setEmbeddedBookingId(bookingId);
        setEmbeddedCheckoutUrl(checkoutUrl);
        return;
      }

      const completeResponse = await fetch(
        buildBackendApiUrl(`payments/mock/${paymentData.data.id}/complete`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const completeData = await completeResponse.json().catch(() => null);
      if (!completeResponse.ok || !completeData?.success) {
        throw new BookingFlowError(
          extractErrorMessage(completeData, "Test payment completion failed."),
          false
        );
      }

      // Re-read the booking so the confirmation shows its final state + Meet link.
      const bookingResponse = await fetch(buildBackendApiUrl(`bookings/${bookingId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingData = await bookingResponse.json().catch(() => null);
      if (bookingResponse.ok && bookingData?.data) {
        setConfirmedStatus(bookingData.data.status ?? null);
        setConfirmedMeetLink(bookingData.data.meetLink ?? null);
      }

      setBookingRef(`BK-${bookingId}`);
      setStep("confirmation");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed. Please try again.";
      setBookingError(message);
      setTime(null);
      setStep("datetime");
    } finally {
      setPaying(false);
    }
  }

  async function createBooking() {
    if (!service || !date || !time) return;
    setBookingError(null);
    setConfirmedMeetLink(null);
    setConfirmedStatus(null);

    try {
      const backendBookingId = await tryCreateBackendBooking(service, date, time);
      if (backendBookingId) {
        setBookingRef(`BK-${backendBookingId}`);
        setStep("confirmation");
        return;
      }
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
          {step !== "service" && <BookingProgress currentIndex={currentIndex} />}

          {bookingError && step === "datetime" && (
            <p className="text-sm mb-6" style={{ color: "var(--orange)" }}>
              {bookingError}
            </p>
          )}

          {step === "service" && (
            <ServiceSelect
              services={services}
              onSelect={(s) => {
                setService(s);
                setStep("datetime");
              }}
            />
          )}

          {step === "datetime" && service && (
            <div className="grid md:grid-cols-2 gap-12">
              <BookingCalendar
                selectedDate={date}
                onSelectDate={(d) => {
                  setDate(d);
                  setTime(null);
                }}
                onAvailabilityForDate={setBookedTimes}
                authDriven={backendMode === true}
              />
              <div>
                {date ? (
                  <>
                    <TimeSlotPicker
                      times={backendMode === true ? backendSlotLabels : undefined}
                      disabledTimes={backendMode === true ? [] : bookedTimes}
                      loading={backendMode === true && (slotsLoading || trainerId === null)}
                      error={backendMode === true ? slotsError : null}
                      selectedTime={time}
                      onSelect={setTime}
                    />
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
                    onClick={() => setStep("payment")}
                  >
                    Continue to Payment
                  </button>
                ) : (
                  <p className="text-sm opacity-40">Fill in your details to continue.</p>
                )}
              </div>
            </div>
          )}

          {step === "payment" && service && date && time && (
            <div className="grid md:grid-cols-2 gap-12">
              {getStoredAuthToken() ? (
                embeddedCheckoutUrl ? (
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)" }}>
                    <h2 className="font-semibold text-lg mb-1">Card payment</h2>
                    <p className="text-sm opacity-60 mb-4">
                      Secure card form hosted by Paymob — embedded right here,
                      your card details never touch our servers.
                    </p>
                    <div
                      className="rounded-xl overflow-hidden border"
                      style={{ borderColor: "rgba(245,241,232,0.15)" }}
                    >
                      <iframe
                        src={embeddedCheckoutUrl}
                        title="Paymob secure card checkout"
                        className="w-full"
                        style={{ height: "560px", border: "none", background: "#fff" }}
                        allow="clipboard-write"
                      />
                    </div>
                    {confirming && (
                      <p className="text-sm mt-4" style={{ color: "var(--orange)" }}>
                        Payment received — confirming your booking…
                      </p>
                    )}
                    <p className="text-xs opacity-50 mt-3">
                      Prefer a full window?{" "}
                      <a
                        href={embeddedCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        Open checkout in a new tab
                      </a>
                    </p>
                  </div>
                ) : activeProvider === "paymob" ? (
                  <div className="rounded-2xl p-8" style={{ background: "var(--surface)" }}>
                    <h2 className="font-semibold text-lg mb-2">Card payment</h2>
                    <p className="text-sm opacity-70 mb-6">
                      The secure card form opens right here on this page — no
                      redirect away from the site. You&apos;ll pay{" "}
                      {service.price} {service.currency} and your booking is confirmed
                      automatically once the payment succeeds — the Google Meet
                      invitation and receipt are emailed to you right after.
                    </p>
                    <TermsAcceptance checked={termsAccepted} onChange={setTermsAccepted} />
                    <button
                      type="button"
                      onClick={() => runBackendPaidBookingFlow("paymob").catch(() => {})}
                      disabled={paying || !termsAccepted}
                      className="btn-pill w-full justify-center disabled:opacity-50"
                    >
                      {paying ? "Opening secure card form…" : `Pay ${service.price} ${service.currency} with Card`}
                    </button>
                    {bookingError && (
                      <p className="text-sm mt-4" style={{ color: "var(--orange)" }} role="alert">
                        {bookingError}
                      </p>
                    )}
                  </div>
                ) : activeProvider === "mock" ? (
                  <div className="rounded-2xl p-8" style={{ background: "var(--surface)" }}>
                    <h2 className="font-semibold text-lg mb-2">Test payment mode</h2>
                    <p className="text-sm opacity-70 mb-6">
                      No live payment gateway is enabled yet (enable Paymob under
                      Admin → Integrations), so this checkout runs in test mode.
                      Completing it exercises the real backend pipeline: payment
                      record → booking confirmation → Google Calendar event &amp;
                      Meet link → confirmation email.
                    </p>
                    <TermsAcceptance checked={termsAccepted} onChange={setTermsAccepted} />
                    <button
                      type="button"
                      onClick={() => runBackendPaidBookingFlow("mock").catch(() => {})}
                      disabled={paying || !termsAccepted}
                      className="btn-pill w-full justify-center disabled:opacity-50"
                    >
                      {paying
                        ? "Processing…"
                        : `Complete Test Payment (${service.price} ${service.currency})`}
                    </button>
                    {bookingError && (
                      <p className="text-sm mt-4" style={{ color: "var(--orange)" }} role="alert">
                        {bookingError}
                      </p>
                    )}
                  </div>
                ) : activeProvider === "none" ? (
                  <div className="rounded-2xl p-8" style={{ background: "var(--surface)" }}>
                    <h2 className="font-semibold text-lg mb-2">Payments unavailable</h2>
                    <p className="text-sm opacity-70">
                      No payment gateway is configured yet. Please check back
                      shortly or contact us to arrange your session.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8" style={{ background: "var(--surface)" }}>
                    <p className="text-sm opacity-70">Loading payment options…</p>
                  </div>
                )
              ) : (
                <PaymentForm
                  amountLabel={`${service.price} ${service.currency}`}
                  submitLabel="Pay & Confirm Booking"
                  showWallets
                  onSuccess={createBooking}
                />
              )}
              <BookingSummary service={service} date={date} time={time} />
            </div>
          )}

          {step === "confirmation" && service && date && time && bookingRef && (
            <BookingConfirmation
              service={service}
              date={date}
              time={time}
              bookingRef={bookingRef}
              meetLink={confirmedMeetLink}
              status={confirmedStatus}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
