"use client";

import { useEffect, useState } from "react";
import { daysInMonth, dateKey, getDayStatus, isPastDay, type DayStatus } from "@/lib/bookingSlots";
import { buildBackendApiUrl, getClientTimezone, getFrontendApiPath, getStoredAuthToken } from "@/lib/api";

type Availability = Record<string, string[]>;
/** Backend month calendar: ISO date → past | closed | fully-booked | booked | available. */
type MonthStatuses = Record<string, string>;

const STATUS_STYLE: Record<DayStatus, { bg: string; color: string; cursor: string }> = {
  available: { bg: "rgba(245,241,232,0.06)", color: "var(--paper)", cursor: "pointer" },
  selected: { bg: "var(--orange)", color: "var(--void)", cursor: "pointer" },
  "fully-booked": { bg: "transparent", color: "var(--paper)", cursor: "not-allowed" },
  unavailable: { bg: "transparent", color: "var(--paper)", cursor: "not-allowed" },
  closed: { bg: "transparent", color: "var(--paper)", cursor: "not-allowed" },
  booked: { bg: "transparent", color: "var(--paper)", cursor: "not-allowed" },
};

const STATUS_TITLE: Partial<Record<DayStatus, string>> = {
  "fully-booked": "Fully booked",
  unavailable: "Unavailable",
  closed: "Closed",
  booked: "The free session for this day is already booked",
};

export function BookingCalendar({
  selectedDate,
  onSelectDate,
  onAvailabilityForDate,
  authDriven = false,
  trainerId = null,
  serviceParam = null,
  refreshKey = 0,
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  /** Reports the booked times for whatever date gets selected, so the parent can pass them to TimeSlotPicker. */
  onAvailabilityForDate: (bookedTimes: string[]) => void;
  /** Backend mode: the expert's real availability (per-date slot fetch) is the
   *  source of truth, so days are open unless in the past — the template KV
   *  store and the hardcoded Friday-closed rule only apply to guests. */
  authDriven?: boolean;
  /** Expert to query the backend month calendar for (authDriven mode only). */
  trainerId?: number | null;
  /** Service type name for the backend month calendar ("FREE_SESSION"). */
  serviceParam?: string | null;
  /** Bump to re-fetch the month data (e.g. after a lost booking race). */
  refreshKey?: number;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [monthStatuses, setMonthStatuses] = useState<MonthStatuses | null>(null);
  const loading = authDriven ? monthStatuses === null : availability === null;

  // Guest template flow: shared KV store of booked slots.
  useEffect(() => {
    if (authDriven) return;
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    fetch(getFrontendApiPath(`/bookings/availability?month=${monthStr}`))
      .then((r) => r.json())
      .then((data) => setAvailability(data.bookedByDate || {}))
      .catch(() => setAvailability({}));
  }, [viewYear, viewMonth, authDriven]);

  // Signed-in flow: per-day statuses straight from the backend, computed with
  // the same rules the slot endpoint uses (past/closed/fully-booked/booked).
  useEffect(() => {
    if (!authDriven || !trainerId) return;
    let cancelled = false;
    setMonthStatuses(null);
    const token = getStoredAuthToken();
    if (!token) {
      setMonthStatuses({});
      return;
    }
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const query = new URLSearchParams({ month: monthStr, clientTimezone: getClientTimezone() });
    if (serviceParam) query.set("service", serviceParam);
    fetch(`${buildBackendApiUrl(`/availability/trainer/${trainerId}/calendar`)}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.success || !Array.isArray(payload.data)) {
          throw new Error("calendar unavailable");
        }
        const statuses: MonthStatuses = {};
        for (const day of payload.data as { date: string; status: string }[]) {
          statuses[day.date] = day.status;
        }
        return statuses;
      })
      .then((statuses) => {
        if (!cancelled) setMonthStatuses(statuses);
      })
      .catch(() => {
        // Fall back to the past-days-only behaviour instead of blocking the flow.
        if (!cancelled) setMonthStatuses({});
      });
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth, authDriven, trainerId, serviceParam, refreshKey]);

  const days = daysInMonth(viewYear, viewMonth);
  const firstWeekday = days[0].getDay();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function goPrev() {
    if (isCurrentMonth) return;
    const d = new Date(viewYear, viewMonth - 1, 1);
    setAvailability(null);
    setMonthStatuses(null);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goNext() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setAvailability(null);
    setMonthStatuses(null);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  /** Maps a backend day status to the button status, keeping "selected" on top. */
  function resolveStatus(day: Date, isSelected: boolean): DayStatus {
    if (isSelected) return "selected";
    if (authDriven) {
      const backend = monthStatuses?.[dateKey(day)];
      if (backend === "past") return "unavailable";
      if (backend === "closed" || backend === "fully-booked" || backend === "booked") {
        return backend;
      }
      // "available", or no backend data (fetch failed) → past-days-only fallback.
      return isPastDay(day) ? "unavailable" : "available";
    }
    return getDayStatus(day, (availability ?? {})[dateKey(day)] || [], isSelected);
  }

  const DAY_OPACITY: Record<string, number> = {
    available: 1,
    selected: 1,
    unavailable: 0.25,
    closed: 0.3,
    "fully-booked": 0.35,
    booked: 0.45,
  };

  function handleSelect(day: Date, status: DayStatus) {
    if (status !== "available" && status !== "selected") return;
    onSelectDate(day);
    onAvailabilityForDate((availability ?? {})[dateKey(day)] || []);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm tracking-widest uppercase" style={{ color: "var(--orange)" }}>
          Select a Date
        </p>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" onClick={goPrev} disabled={isCurrentMonth} className="opacity-70 hover:opacity-100 disabled:opacity-20">
            &larr;
          </button>
          <span className="opacity-80 min-w-32 text-center">
            {new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button type="button" onClick={goNext} className="opacity-70 hover:opacity-100">
            &rarr;
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm opacity-40">Loading availability…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="text-center text-xs opacity-40 pb-1">
              {d}
            </span>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected = !!selectedDate && dateKey(selectedDate) === dateKey(day);
            const status = resolveStatus(day, isSelected);
            const style = STATUS_STYLE[status];
            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => handleSelect(day, status)}
                disabled={status !== "available" && status !== "selected"}
                className="aspect-square rounded-lg text-sm flex items-center justify-center transition-colors"
                style={{
                  background: style.bg,
                  color: status === "booked" ? "var(--orange)" : style.color,
                  cursor: style.cursor,
                  opacity: DAY_OPACITY[status] ?? 1,
                  textDecoration: status === "closed" ? "line-through" : undefined,
                }}
                title={STATUS_TITLE[status] ?? (status === "available" ? "Available" : undefined)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      )}

      {authDriven ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs opacity-50">
          <span>&#9679; Available</span>
          <span>&#9675; Fully Booked</span>
          <span style={{ textDecoration: "line-through" }}>Closed</span>
          <span style={{ color: "var(--orange)" }}>&#9679; Free Session Taken</span>
          <span className="opacity-60">Past</span>
        </div>
      ) : (
        <div className="flex gap-4 mt-4 text-xs opacity-50">
          <span>&#9679; Available</span>
          <span>&#9675; Fully Booked / Unavailable</span>
        </div>
      )}
    </div>
  );
}
