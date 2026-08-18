"use client";

import Link from "next/link";
import { useCart, useCartItems } from "./CartContext";
import { BlueprintCover } from "@/components/blueprints/BlueprintCover";
import { MagneticButton } from "@/components/motion/MagneticButton";

export function CartDrawer() {
  const { isOpen, close, subtotal, removeItem } = useCart();
  const items = useCartItems();
  return (
    <>
      <div
        className="fixed inset-0 z-[70] transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className="fixed top-0 right-0 z-[71] h-full w-full max-w-md flex flex-col transition-transform duration-300"
        style={{
          background: "var(--void)",
          borderLeft: "1px solid rgba(245,241,232,0.1)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(245,241,232,0.08)" }}>
          <p className="text-sm tracking-widest uppercase">Your Cart</p>
          <button type="button" onClick={close} aria-label="Close cart" className="text-xl leading-none opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="display-text text-2xl mb-3">Your cart is empty.</p>
            <p className="text-sm opacity-60 mb-8">Build your gym system with Gymholic Blueprints.</p>
            <Link href="/blueprints" onClick={close} className="btn-pill">
              Explore Blueprints
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 shrink-0">
                    {item.coverLines ? (
                      <BlueprintCover lines={item.coverLines} size="mini" />
                    ) : (
                      <div
                        className="w-full h-full rounded-lg flex items-center justify-center text-2xl"
                        style={{ background: "rgba(255,106,0,0.12)", border: "1px solid rgba(255,106,0,0.25)" }}
                        aria-hidden
                      >
                        {item.productType === "ACADEMY" ? "🎓" : "📄"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs opacity-50 mb-1">{item.kindLabel}</p>
                    <p className="text-sm" style={{ color: "var(--orange)" }}>
                      ${item.price}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs opacity-50 hover:opacity-100 self-start"
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(245,241,232,0.08)" }}>
              <div className="flex justify-between text-sm mb-1 opacity-70">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-sm mb-3 opacity-70">
                <span>Digital Delivery</span>
                <span>FREE</span>
              </div>
              <div className="flex justify-between text-base font-medium mb-5">
                <span>Total</span>
                <span>${subtotal}</span>
              </div>
              <MagneticButton href="/checkout" className="btn-pill w-full justify-center">
                Proceed to Checkout
              </MagneticButton>
              <p className="text-xs opacity-40 text-center mt-3">Secure digital checkout</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
