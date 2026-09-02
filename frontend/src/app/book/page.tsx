"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ServiceSelect } from "@/components/booking/ServiceSelect";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { BookingDetailsForm, emptyBookingDetails, type BookingDetails } from "@/components/booking/BookingDetailsForm";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { TotalRow } from "@/components/payment/PaymentCard";
import type { ConsultationService } from "@/lib/consultations";
import { consultationServices } from "@/lib/consultations";
import { applyPricing, fetchBookingPricing, filterDisabledServices } from "@/lib/pricing";
import { dateKey, formatDateLabel, SLOT_TIMES } from "@/lib/bookingSlots";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";
import { fetchCurrentUser } from "@/lib/auth";
import {
  buildBackendApiUrl,
  getClientTimezone,
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
    details.referral ? `Heard about us: ${details.referral}` : null,
    details.message ? `Message: ${details.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function BookPage() {
  useLenis();
  const router = useRouter();

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
  // True while the slot is being reserved before handing off to /pay.
  const [paying, setPaying] = useState(false);
  // Bumped after a lost booking race so the month calendar re-fetches.
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // The 3-hour Free Time Session: 180-minute slots from the backend, still
  // limited to one session per day — paid like every other service.
  const isFreeSession = service?.id === "free-session";
  // Signed-in account profile — prefills the details form (phone locked).
  const [accountPhone, setAccountPhone] = useState<string | null>(null);

  // Live prices from the backend (admin-managed); falls back to catalogue defaults.
  useEffect(() => {
    let cancelled = false;
    fetchBookingPricing().then((pricing) => {
      if (!cancelled && pricing) {
        setServices(filterDisabledServices(applyPricing(consultationServices, pricing), pricing));
      }
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

  // Prefill the details form from the signed-in account (name/email editable,
  // phone locked). Only fills fields the user hasn't typed into yet.
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    fetchCurrentUser(token).then((user) => {
      if (cancelled || !user) return;
      setAccountPhone(user.phone ?? null);
      setDetails((current) => ({
        ...current,
        fullName:
          current.fullName ||
          [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: current.email || user.email,
        phone: current.phone || user.phone || "",
      }));
    });
    return () => {
      cancelled = true;
    };
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
    if (isFreeSession) query.set("service", "FREE_SESSION");
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
  }, [date, backendMode, step, trainerId, isFreeSession]);

  const backendSlotLabels = useMemo(
    () => [...new Set(backendSlots.map((slot) => toTemplateTimeLabel(slot.displayTime)))],
    [backendSlots]
  );

  // Best-option auto-selection: as soon as a date's real availability lands,
  // the nearest open slot is selected for the user (they can still change it).
  useEffect(() => {
    if (step !== "datetime" || !date || time) return;
    if (backendMode === true) {
      if (!slotsLoading && backendSlotLabels.length > 0) {
        setTime(backendSlotLabels[0]);
      }
    } else if (backendMode === false) {
      const firstOpen = SLOT_TIMES.find((t) => !bookedTimes.includes(t));
      if (firstOpen) setTime(firstOpen);
    }
  }, [step, date, time, backendMode, slotsLoading, backendSlotLabels, bookedTimes]);

  /** Creates the PENDING booking on the backend, then hands off to the
   *  dedicated /pay page for the actual payment. */
  async function tryCreateBackendBooking(selectedService: ConsultationService, selectedDate: Date, selectedTime: string) {
    const token = getStoredAuthToken();

    if (!token) {
      throw new BookingFlowError("Backend booking requires a signed-in Gymholic user session.", true);
    }

    const clientTimezone = getClientTimezone();
    const effectiveTrainerId = trainerId ?? FALLBACK_TRAINER_ID;
    const freeSession = selectedService.id === "free-session";
    const query = new URLSearchParams({
      date: dateKey(selectedDate),
      clientTimezone,
    });
    if (freeSession) query.set("service", "FREE_SESSION");

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
        ...(freeSession ? { serviceType: "FREE_SESSION" } : {}),
      }),
    });

    const bookingData = await bookingResponse.json().catch(() => null);

    if (!bookingResponse.ok) {
      throw new BookingFlowError(
        extractErrorMessage(bookingData, "The backend rejected this booking."),
        [401, 403, 404].includes(bookingResponse.status)
      );
    }

    return (bookingData as { data?: { id?: number | string; status?: string; meetLink?: string | null } } | null)
      ?.data ?? null;
  }

  /**
   * Payment hand-off: reserve the slot as a PENDING booking on the backend,
   * then send the user to the dedicated Gymholic Pay page (the same secure
   * payment surface every purchase uses). Guests are asked to sign in first
   * — the flow is waiting for them when they come back.
   */
  async function proceedToPayment() {
    if (!service || !date || !time) return;
    const token = getStoredAuthToken();
    if (!token) {
      router.push("/login?next=/book");
      return;
    }
    setPaying(true);
    setBookingError(null);
    try {
      const created = await tryCreateBackendBooking(service, date, time);
      const bookingId = created?.id ? Number(created.id) : null;
      if (!bookingId) {
        throw new BookingFlowError("The backend rejected this booking.", false);
      }
      // Zero-priced services come back already confirmed (no payment, no
      // approval wait) — show the confirmation immediately.
      if (created?.status === "CONFIRMED") {
        setBookingRef(String(bookingId));
        setConfirmedMeetLink(created.meetLink ?? null);
        setConfirmedStatus("CONFIRMED");
        setStep("confirmation");
        return;
      }
      router.push(
        `/pay?booking=${bookingId}&amount=${service.price}` +
        `&currency=${encodeURIComponent(service.currency)}` +
        `&label=${encodeURIComponent(service.name)}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "That slot is no longer available. Please pick another time.";
      setBookingError(message);
      setTime(null);
      setCalendarRefreshKey((key) => key + 1);
      setStep("datetime");
    } finally {
      setPaying(false);
    }
  }

  const detailsValid =
    details.fullName.trim() && details.email.trim() && details.phone.trim() && details.country.trim() && details.topic.trim();

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <div className="max-w-5xl xl:max-w-6xl mx-auto">
          {step !== "service" && (
        <BookingProgress
          currentIndex={currentIndex}
        />
      )}

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
            <div className="max-w-4xl xl:max-w-6xl mx-auto rounded-2xl p-6 md:p-10 xl:p-12" style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}>
              <div className="grid md:grid-cols-2 gap-10 md:gap-14 xl:gap-20">
                <BookingCalendar
                  selectedDate={date}
                  onSelectDate={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                  onAvailabilityForDate={setBookedTimes}
                  authDriven={backendMode === true}
                  trainerId={backendMode === true ? trainerId : null}
                  serviceParam={isFreeSession ? "FREE_SESSION" : null}
                  refreshKey={calendarRefreshKey}
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
                        highlightTime={backendMode === true ? backendSlotLabels[0] ?? null : SLOT_TIMES.find((t) => !bookedTimes.includes(t)) ?? null}
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
            </div>
          )}

          {step === "details" && service && date && time && (
            <div className="grid md:grid-cols-2 gap-12">
              <BookingDetailsForm values={details} onChange={setDetails} lockedPhone={!!accountPhone} />
              <div className="space-y-6">
                <BookingSummary service={service} date={date} time={time} />
                {detailsValid ? (
                  <button
                    type="button"
                    className="btn-pill w-full justify-center disabled:opacity-50"
                    disabled={paying}
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
              <div
                className="rounded-2xl p-6 md:p-8"
                style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
              >
                <TotalRow amount={service.price} currency={service.currency} />
                {service.price > 0 ? (
                  <p className="text-sm opacity-70 mb-6">
                    Continue to Gymholic Pay — a secure, dedicated payment page. Your booking is
                    confirmed automatically once the payment succeeds; the Google Meet invitation
                    and receipt are emailed to you right after.
                  </p>
                ) : (
                  <p className="text-sm opacity-70 mb-6">
                    This session is free — your booking is confirmed instantly and the Google
                    Meet invitation is emailed to you right away.
                  </p>
                )}
                {bookingError && (
                  <p className="text-sm mb-4" style={{ color: "var(--orange)" }} role="alert">
                    {bookingError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => proceedToPayment().catch(() => {})}
                  disabled={paying}
                  className="btn-pill w-full justify-center disabled:opacity-50"
                >
                  {paying
                    ? "Reserving your slot…"
                    : service.price > 0
                      ? "Proceed to Secure Payment \u2192"
                      : "Confirm Booking \u2192"}
                </button>
                {service.price > 0 && (
                  <p className="text-xs opacity-40 mt-4 text-center">
                    You&apos;ll pay on a separate secure page — cards are handled by our payment gateway.
                  </p>
                )}
              </div>
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
