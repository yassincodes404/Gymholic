import { SLOT_TIMES } from "@/lib/bookingSlots";

export function TimeSlotPicker({
  bookedTimes,
  selectedTime,
  onSelect,
}: {
  bookedTimes: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  return (
    <div>
      <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
        Available Times
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SLOT_TIMES.map((time) => {
          const isBooked = bookedTimes.includes(time);
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
    </div>
  );
}
