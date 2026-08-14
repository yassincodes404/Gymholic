import { blueprintCategories, type BlueprintCategory } from "@/lib/blueprints";

type BlueprintFiltersProps = {
  active: BlueprintCategory | "All";
  onChange: (value: BlueprintCategory | "All") => void;
};

/** Minimal, visually-integrated category filter row — pills, not a sidebar. */
export function BlueprintFilters({ active, onChange }: BlueprintFiltersProps) {
  const options: (BlueprintCategory | "All")[] = ["All", ...blueprintCategories];

  return (
    <div className="flex flex-wrap gap-2 px-6 md:px-10 mb-10">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors"
          style={{
            background: active === opt ? "var(--orange)" : "rgba(245,241,232,0.06)",
            color: active === opt ? "var(--void)" : "var(--paper)",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
