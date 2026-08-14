"use client";

import { useCart } from "./CartContext";

/** Header cart icon + item-count badge, opens the CartDrawer. */
export function CartButton() {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      className="relative flex items-center justify-center w-9 h-9 rounded-full"
      style={{ color: "var(--paper)" }}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 8H6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="20.5" r="1.4" fill="currentColor" />
        <circle cx="17.5" cy="20.5" r="1.4" fill="currentColor" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold"
          style={{ background: "var(--orange)", color: "var(--void)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
