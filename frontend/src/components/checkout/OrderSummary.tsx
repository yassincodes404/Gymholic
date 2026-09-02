"use client";

import type { CatalogProduct } from "@/lib/catalog";
import { BlueprintCover } from "@/components/blueprints/BlueprintCover";
import { IconPdf, IconGraduationCap } from "@/components/account/icons";

/*!
 * Order summary — the review column shared by checkout and the guest sign-in
 * gate. Rows lift slightly on hover; products without a generated cover get
 * the brand icon tile (PDF / Academy) instead of an emoji.
 */
export function OrderSummary({ items, total }: { items: CatalogProduct[]; total: number }) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8 booking-rise"
      style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--orange)" }}>
          Order Summary
        </p>
        <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange/15 text-orange">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 rounded-xl p-3 -m-1 transition-colors"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,241,232,0.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-14 h-14 shrink-0">
              {item.coverLines ? (
                <BlueprintCover lines={item.coverLines} size="mini" />
              ) : (
                <div
                  className="w-full h-full rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,106,0,0.10)", border: "1px solid rgba(255,106,0,0.25)", color: "var(--orange)" }}
                  aria-hidden
                >
                  {item.productType === "ACADEMY" ? <IconGraduationCap width={24} height={24} /> : <IconPdf width={24} height={24} />}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs opacity-50">{item.kindLabel}</p>
            </div>
            <span className="text-sm font-medium">${item.price}</span>
          </div>
        ))}
      </div>
      <div className="pt-4 space-y-2" style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}>
        <div className="flex justify-between text-sm opacity-70">
          <span>Subtotal</span>
          <span>${total}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] uppercase tracking-[0.2em] opacity-60">Total (USD)</span>
          <span className="display-text text-2xl">${total}</span>
        </div>
      </div>
    </div>
  );
}
