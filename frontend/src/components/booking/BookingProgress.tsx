const STEPS = ["Service", "Date & Time", "Details", "Payment", "Confirmed"];

export function BookingProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-14 text-xs uppercase tracking-widest">
      {STEPS.map((label, i) => (
        <span key={label} className="flex items-center gap-2">
          <span style={{ color: i <= currentIndex ? "var(--orange)" : "var(--paper)", opacity: i <= currentIndex ? 1 : 0.35 }}>
            {String(i + 1).padStart(2, "0")} {label}
          </span>
          {i < STEPS.length - 1 && <span className="opacity-25">&rarr;</span>}
        </span>
      ))}
    </div>
  );
}
