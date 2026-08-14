"use client";

import { useEffect, useState } from "react";
import { daysInMonth, dateKey, getDayStatus, type DayStatus } from "@/lib/bookingSlots";

type Availability = Record<string, string[]>;

const STATUS_STYLE: Record<DayStatus, { bg: string; color: string; cursor: string }> = {
  available: { bg: "rgba(245,241,232,0.06)", color: "var(--paper)", cursor: "pointer" },
  selected: { bg: "var(--orange)", color: "var(--void)", cursor: "pointer" },
  "fully-booked": { bg: "transparent", color: "var(--paper)", cursor: "not-allowed" },
  unavailable: { bg: "transparent", color: "var(--paper)", cursor: "not-allowed" },
};

export function BookingCalendar({
  selectedDate,
  onSelectDate,
  onAvailabilityForDate,
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  /** Reports the booked times for whatever date gets selected, so the parent can pass them to TimeSlotPicker. */
  onAvailabilityForDate: (bookedTimes: string[]) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState<Availability>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => setAvailability(data.bookedByDate || {}))
      .catch(() => setAvailability({}))
      .finally(() => setLoading(false));
  }, [viewYear, viewMonth]);

  const days = daysInMonth(viewYear, viewMonth);
  const firstWeekday = days[0].getDay();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function goPrev() {
    if (isCurrentMonth) return;
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goNext() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function handleSelect(day: Date, status: DayStatus) {
    if (status === "fully-booked" || status === "unavailable") return;
    onSelectDate(day);
    onAvailabilityForDate(availability[dateKey(day)] || []);
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
            const status = getDayStatus(day, availability[dateKey(day)] || [], isSelected);
            const style = STATUS_STYLE[status];
            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => handleSelect(day, status)}
                disabled={status === "fully-booked" || status === "unavailable"}
                className="aspect-square rounded-lg text-sm flex items-center justify-center transition-colors"
                style={{ background: style.bg, color: style.color, cursor: style.cursor, opacity: status === "unavailable" ? 0.25 : status === "fully-booked" ? 0.35 : 1 }}
                title={status === "fully-booked" ? "Fully booked" : status === "unavailable" ? "Unavailable" : "Available"}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-4 mt-4 text-xs opacity-50">
        <span>&#9679; Available</span>
        <span>&#9675; Fully Booked / Unavailable</span>
      </div>
    </div>
  );
}
