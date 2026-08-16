import type { CatalogProduct } from "@/lib/catalog";
import { BlueprintCover } from "@/components/blueprints/BlueprintCover";

export function OrderSummary({ items, total }: { items: CatalogProduct[]; total: number }) {
  return (
    <div className="rounded-2xl p-6 md:p-8" style={{ background: "var(--surface)" }}>
      <p className="text-sm tracking-widest uppercase mb-6" style={{ color: "var(--orange)" }}>
        Order Summary
      </p>
      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className="w-14 h-14 shrink-0">
              {item.coverLines ? (
                <BlueprintCover lines={item.coverLines} size="mini" />
              ) : (
                <div
                  className="w-full h-full rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "rgba(255,106,0,0.12)", border: "1px solid rgba(255,106,0,0.25)" }}
                  aria-hidden
                >
                  {item.productType === "ACADEMY" ? "🎓" : "📄"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs opacity-50">{item.kindLabel}</p>
            </div>
            <span className="text-sm">${item.price}</span>
          </div>
        ))}
      </div>
      <div className="pt-4 space-y-2" style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}>
        <div className="flex justify-between text-sm opacity-70">
          <span>Subtotal</span>
          <span>${total}</span>
        </div>
        <div className="flex justify-between text-base font-medium">
          <span>Total (USD)</span>
          <span>${total}</span>
        </div>
      </div>
    </div>
  );
}
