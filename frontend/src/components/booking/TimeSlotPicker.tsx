import { SLOT_TIMES } from "@/lib/bookingSlots";

export function TimeSlotPicker({
  times = SLOT_TIMES,
  disabledTimes = [],
  loading = false,
  error = null,
  selectedTime,
  onSelect,
  highlightTime = null,
}: {
  /** Time labels to offer — live backend slots when signed in, template slots for guests. */
  times?: string[];
  /** Labels to render as taken (guest mode: booked in the shared KV store). */
  disabledTimes?: string[];
  loading?: boolean;
  error?: string | null;
  selectedTime: string | null;
  onSelect: (time: string) => void;
  /** The auto-picked "best option" (first upcoming slot) gets a tag. */
  highlightTime?: string | null;
}) {
  return (
    <div>
      <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
        Available Times
      </p>
      {loading ? (
        <p className="text-sm opacity-60">Loading available times…</p>
      ) : error ? (
        <p className="text-sm" style={{ color: "var(--orange)" }}>
          {error}
        </p>
      ) : times.length === 0 ? (
        <p className="text-sm opacity-60">No open slots on this day — try another date.</p>
      ) : (
        <div key={times.join("|")} className="booking-rise grid grid-cols-2 sm:grid-cols-3 gap-3">
          {times.map((time) => {
            const isBooked = disabledTimes.includes(time);
            const isSelected = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                disabled={isBooked}
                onClick={() => onSelect(time)}
                className={`booking-tile ${isSelected ? "booking-tile-selected" : ""} rounded-lg md:rounded-xl px-4 py-3 md:py-3.5 text-sm md:text-base flex flex-col items-center gap-1`}
                style={{
                  background: isSelected ? "var(--orange)" : "rgba(245,241,232,0.06)",
                  color: isSelected ? "var(--void)" : "var(--paper)",
                  opacity: isBooked ? 0.3 : 1,
                  cursor: isBooked ? "not-allowed" : "pointer",
                }}
              >
                <span>{time}</span>
                {time === highlightTime && !isBooked ? (
                  <span
                    className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      background: isSelected ? "rgba(10,10,10,0.25)" : "var(--orange-dim)",
                      color: isSelected ? "var(--void)" : "var(--orange)",
                    }}
                  >
                    Best option
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest opacity-70">
                    {isBooked ? "Fully Booked" : "Available"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
