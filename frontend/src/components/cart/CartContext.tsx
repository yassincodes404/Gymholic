"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { blueprints, getBlueprint } from "@/lib/blueprints";

const CART_KEY = "gymholic-cart";

type CartContextValue = {
  itemIds: string[];
  addItem: (blueprintId: string) => void;
  removeItem: (blueprintId: string) => void;
  clear: () => void;
  isInCart: (blueprintId: string) => boolean;
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Client-only cart, persisted to localStorage so it survives navigation
 * and page reloads. Digital products, so quantity is always 1 per item —
 * "adding" an already-present blueprint is a no-op, not a quantity bump.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [itemIds, setItemIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_KEY, JSON.stringify(itemIds));
  }, [itemIds, hydrated]);

  const addItem = useCallback((blueprintId: string) => {
    if (!getBlueprint(blueprintId)) return;
    setItemIds((ids) => (ids.includes(blueprintId) ? ids : [...ids, blueprintId]));
  }, []);

  const removeItem = useCallback((blueprintId: string) => {
    setItemIds((ids) => ids.filter((id) => id !== blueprintId));
  }, []);

  const clear = useCallback(() => setItemIds([]), []);
  const isInCart = useCallback((blueprintId: string) => itemIds.includes(blueprintId), [itemIds]);

  const subtotal = useMemo(
    () => itemIds.reduce((sum, id) => sum + (getBlueprint(id)?.price ?? 0), 0),
    [itemIds]
  );

  const value: CartContextValue = {
    itemIds,
    addItem,
    removeItem,
    clear,
    isInCart,
    count: itemIds.length,
    subtotal,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/** Convenience: resolved Blueprint objects for whatever's currently in the cart. */
export function useCartItems() {
  const { itemIds } = useCart();
  return useMemo(() => itemIds.map((id) => getBlueprint(id)).filter(Boolean) as (typeof blueprints)[number][], [itemIds]);
}
