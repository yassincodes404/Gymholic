/*!
  GymHolic Admin Calendar — month grid of real bookings (GET /api/bookings/trainer/{id}).
  Cancelled bookings are filtered out at load: the calendar shows what is
  actionable (pending / confirmed / completed / no-show), not noise.
*/

"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch, getAdminUserId, type TrainerBooking } from "@/lib/adminApi";
import { IconChevronLeft, IconChevronRight } from "@/components/account/icons";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_DOT: Record<TrainerBooking["status"], string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-emerald-400",
  COMPLETED: "bg-blue-400",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-paper/60",
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dayKey(d: Date) {
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminCalendarPage() {
  const [bookings, setBookings] = useState<TrainerBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const userId = getAdminUserId();
    if (!userId) return;
    adminFetch<{ content: TrainerBooking[] }>(`bookings/trainer/${userId}?size=200`)
      .then((data) => setBookings(data.content ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load bookings."))
      .finally(() => setLoading(false));
  }, []);

  // Cancelled bookings are noise on a planning surface — drop them entirely.
  const visibleBookings = useMemo(
    () => bookings.filter((b) => b.status !== "CANCELLED"),
    [bookings]
  );

  const byDay = useMemo(() => {
    const map: Record<string, TrainerBooking[]> = {};
    for (const b of visibleBookings) {
      const key = dayKey(new Date(b.startTime));
      (map[key] ??= []).push(b);
    }
    return map;
  }, [visibleBookings]);

  // Build the month grid: start on Monday, always 42 cells.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday=0
    const start = new Date(first);
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const selectedBookings = selected ? byDay[selected] ?? [] : [];

  return (
    <AdminShell activeHref="/admin/calendar">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="admin-icon-btn"
            aria-label="Previous month"
          >
            <IconChevronLeft width={16} height={16} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="admin-btn admin-btn-ghost !py-1.5"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="admin-icon-btn"
            aria-label="Next month"
          >
            <IconChevronRight width={16} height={16} />
          </button>
        </div>
      </div>

      {error && <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>}
      {loading ? (
        <p className="text-paper/60">Loading calendar…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="bg-surface border border-paper/10 rounded-xl p-4">
            <div className="grid grid-cols-7 mb-2 text-center text-xs uppercase tracking-wider text-paper/50">
              {WEEKDAYS.map((d) => <span key={d} className="py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d) => {
                const key = dayKey(d);
                const inMonth = monthKey(d) === monthKey(cursor);
                const dayBookings = byDay[key] ?? [];
                const isToday = key === dayKey(new Date());
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`min-h-11 sm:min-h-[72px] rounded-lg border p-1 sm:p-1.5 text-left align-top transition-colors ${
                      selected === key ? "border-paper/30 bg-paper/10" : "border-paper/10 hover:bg-paper/10"
                    } ${inMonth ? "" : "opacity-30"}`}
                  >
                    <span className={`text-xs ${isToday ? "text-emerald-400 font-bold" : "text-paper/60"}`}>
                      {d.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {/* Phones: dots only — the details live in the day panel */}
                      {dayBookings.slice(0, 3).map((b) => (
                        <div key={b.id} className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[b.status]}`} />
                          <span className="hidden sm:inline text-[10px] text-paper/75 truncate">
                            {new Date(b.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} {b.clientName.split(" ")[0]}
                          </span>
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="hidden sm:block text-[10px] text-paper/50">+{dayBookings.length - 3} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-surface border border-paper/10 rounded-xl p-5 h-fit">
            <h2 className="font-semibold mb-4">
              {selected
                ? new Date(selected + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                : "Select a day"}
            </h2>
            {selectedBookings.length === 0 ? (
              <p className="text-paper/50 text-sm">No consultations on this day.</p>
            ) : (
              <ul className="space-y-4">
                {selectedBookings.map((b) => (
                  <li key={b.id} className="border-b border-paper/10 pb-3 last:border-0">
                    <p className="font-medium">
                      {new Date(b.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(b.endTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {b.clientName}
                    </p>
                    <p className="text-xs text-paper/50 mt-0.5">
                      {b.status}
                      {b.meetLink && (
                        <>
                          {" · "}
                          <a href={b.meetLink} target="_blank" rel="noreferrer" className="underline hover:no-underline">
                            Meet link
                          </a>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
