import { SLOT_TIMES } from "@/lib/bookingSlots";

export function TimeSlotPicker({
  times = SLOT_TIMES,
  disabledTimes = [],
  loading = false,
  error = null,
  selectedTime,
  onSelect,
}: {
  /** Time labels to offer — live backend slots when signed in, template slots for guests. */
  times?: string[];
  /** Labels to render as taken (guest mode: booked in the shared KV store). */
  disabledTimes?: string[];
  loading?: boolean;
  error?: string | null;
  selectedTime: string | null;
  onSelect: (time: string) => void;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {times.map((time) => {
            const isBooked = disabledTimes.includes(time);
            const isSelected = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                disabled={isBooked}
                onClick={() => onSelect(time)}
                className="rounded-lg px-4 py-3 text-sm flex flex-col items-center gap-1 transition-colors"
                style={{
                  background: isSelected ? "var(--orange)" : "rgba(245,241,232,0.06)",
                  color: isSelected ? "var(--void)" : "var(--paper)",
                  opacity: isBooked ? 0.3 : 1,
                  cursor: isBooked ? "not-allowed" : "pointer",
                }}
              >
                <span>{time}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-70">
                  {isBooked ? "Fully Booked" : "Available"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
