/*!
  GymHolic Client Reschedule — public page behind the one-time link emailed
  after a no-show (?token=...). No sign-in required: the token authorizes
  picking a new time for the already-paid session.
*/

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { buildBackendApiUrl } from "@/lib/api";

interface RescheduleSummary {
  bookingId: number;
  clientFirstName: string;
  trainerName: string;
  originalStartTime: string;
  rescheduleExpiresAt: string;
  clientTimezone: string;
  expertAttended: boolean | null;
}

interface Slot {
  startTime: string;
  endTime: string;
  displayTime: string;
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getJson(path: string) {
  const res = await fetch(buildBackendApiUrl(path));
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || "Request failed. Please try again.");
  }
  return payload.data;
}

function RescheduleContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [summary, setSummary] = useState<RescheduleSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => {
    const list: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadError("This reschedule link is missing its token. Please use the link from your email.");
      setLoading(false);
      return;
    }
    getJson(`bookings/reschedule/${encodeURIComponent(token)}`)
      .then(setSummary)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "This link is not valid."))
      .finally(() => setLoading(false));
  }, [token]);

  const loadSlots = useCallback(
    async (date: string) => {
      if (!token) return;
      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedSlot(null);
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const data = await getJson(
          `bookings/reschedule/${encodeURIComponent(token)}/slots?date=${date}&timezone=${encodeURIComponent(timezone)}`
        );
        setSlots(Array.isArray(data) ? data : []);
      } catch (e) {
        setSlotsError(e instanceof Error ? e.message : "Could not load available times.");
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [token]
  );

  async function confirm() {
    if (!token || !selectedSlot) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(buildBackendApiUrl(`bookings/reschedule/${encodeURIComponent(token)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStartTime: selectedSlot.startTime,
          newEndTime: selectedSlot.endTime,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not confirm the new time.");
      }
      setDone(payload.data?.startTime ?? selectedSlot.startTime);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Could not confirm the new time.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm opacity-60">Checking your reschedule link…</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <div className="max-w-2xl mx-auto rounded-2xl p-8" style={{ background: "var(--surface)" }}>
          <h1 className="display-text text-2xl mb-3">Link not available</h1>
          <p className="text-sm opacity-70">{loadError}</p>
          <p className="text-sm opacity-50 mt-4">
            Reply to your confirmation email and we&apos;ll set up a new time for you.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
      <div className="max-w-2xl mx-auto">
        {done ? (
          <div className="rounded-2xl p-8" style={{ background: "var(--surface)" }}>
            <h1 className="display-text text-3xl mb-4">You&apos;re rebooked.</h1>
            <p className="text-sm opacity-70 mb-2">
              Your new session{summary ? ` with ${summary.trainerName}` : ""} is confirmed for
              <strong> {formatWhen(done)}</strong>.
            </p>
            <p className="text-sm opacity-50">
              A confirmation email is on its way, and the calendar invitation will be updated.
              You&apos;ll get reminders 24 hours and 1 hour before the session.
            </p>
          </div>
        ) : (
          <>
            <h1 className="display-text text-3xl md:text-4xl mb-3">Pick a new time</h1>
            <p className="text-sm opacity-70 mb-8">
              {summary ? (
                <>
                  Hi {summary.clientFirstName} — your missed session with{" "}
                  {summary.trainerName} (originally {formatWhen(summary.originalStartTime)})
                  {summary.expertAttended === false
                    ? " is rebooked free of charge, or you can reply to our email for a full refund."
                    : " is kept as credit — choose any open slot below."}
                </>
              ) : (
                "Choose any open slot below."
              )}
            </p>

            <div className="rounded-2xl p-6 md:p-8 mb-6" style={{ background: "var(--surface)" }}>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--orange)" }}>
                1 · Choose a day
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {days.map((d) => {
                  const key = dateKey(d);
                  const active = selectedDate === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(key);
                        loadSlots(key);
                      }}
                      className={`btn-pill text-sm whitespace-nowrap ${active ? "" : "opacity-70"}`}
                      style={
                        active
                          ? { background: "var(--orange)", color: "#141414" }
                          : { border: "1px solid rgba(245,241,232,0.2)" }
                      }
                    >
                      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="rounded-2xl p-6 md:p-8 mb-6" style={{ background: "var(--surface)" }}>
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--orange)" }}>
                  2 · Choose a time
                </p>
                {slotsLoading ? (
                  <p className="text-sm opacity-60">Loading available times…</p>
                ) : slotsError ? (
                  <p className="text-sm" style={{ color: "var(--orange)" }}>{slotsError}</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm opacity-60">No open slots on this day — try another date above.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                      const active = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-lg px-3 py-2 text-sm transition-colors ${active ? "" : "opacity-70 hover:opacity-100"}`}
                          style={
                            active
                              ? { background: "var(--orange)", color: "#141414", fontWeight: 600 }
                              : { border: "1px solid rgba(245,241,232,0.2)" }
                          }
                        >
                          {slot.displayTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div className="rounded-2xl p-6 md:p-8" style={{ background: "var(--surface)" }}>
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--orange)" }}>
                  3 · Confirm
                </p>
                <p className="text-sm opacity-70 mb-6">
                  New time: <strong>{formatWhen(selectedSlot.startTime)}</strong> (45 minutes)
                </p>
                {confirmError && (
                  <p className="text-sm mb-4" style={{ color: "var(--orange)" }} role="alert">
                    {confirmError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={confirm}
                  disabled={confirming}
                  className="btn-pill w-full justify-center disabled:opacity-50"
                >
                  {confirming ? "Confirming…" : "Confirm New Time"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense
      fallback={
        <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
          <p className="text-sm opacity-60">Loading…</p>
        </main>
      }
    >
      <Header />
      <RescheduleContent />
      <Footer />
    </Suspense>
  );
}
