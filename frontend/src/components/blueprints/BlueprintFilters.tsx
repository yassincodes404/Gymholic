"use client";

type BlueprintFiltersProps = {
  active: string;
  onChange: (value: string) => void;
  /** Pill labels — category names (slug "all" reserved for the first pill). */
  options: { label: string; value: string }[];
};

/** Minimal, visually-integrated category filter row — pills, not a sidebar. */
export function BlueprintFilters({ active, onChange, options }: BlueprintFiltersProps) {
  const pills = [{ label: "All", value: "all" }, ...options];

  return (
    <div className="flex flex-wrap gap-2 px-6 md:px-10 mb-10">
      {pills.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors"
          style={{
            background: active === opt.value ? "var(--orange)" : "rgba(245,241,232,0.06)",
            color: active === opt.value ? "var(--void)" : "var(--paper)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
