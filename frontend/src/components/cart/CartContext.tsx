"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getCatalogProduct, type CatalogProduct } from "@/lib/catalog";
import { buildBackendApiUrl } from "@/lib/api";
import { ensureStoreProductsLoaded } from "@/lib/store";
import { AUTH_CHANGED_EVENT, getStoredAuthToken } from "@/lib/auth";

const CART_KEY = "gymholic-cart";

type CartContextValue = {
  itemIds: string[];
  /** Adds any catalog product (blueprint, Academy membership, future courses). */
  addProduct: (product: CatalogProduct) => void;
  /** Blueprint shorthand for addProduct. */
  addItem: (blueprintId: string) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  isInCart: (productId: string) => boolean;
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  let res: Response;
  try {
    res = await fetch(buildBackendApiUrl(path), {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    // Backend unreachable — degrade to the guest/localStorage cart instead
    // of surfacing an unhandled "Failed to fetch" rejection.
    return null;
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) return null;
  return payload.data as T;
}

/**
 * Cart for digital products (quantity is always 1 per item — "adding" an
 * already-present item is a no-op, not a quantity bump).
 *
 * Storage strategy: signed-in users get a server-persisted cart
 * (GET/POST/DELETE /api/cart on the Spring Boot backend) so it follows the
 * account across devices; guests use localStorage. On sign-in, any guest
 * cart is merged into the server cart, then localStorage is retired.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const syncingRef = useRef(false);

  // Initial load: server cart when signed in, localStorage otherwise. Store
  // products are loaded first so cart items carrying backend slugs resolve.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureStoreProductsLoaded().catch(() => null);
      if (cancelled) return;
      const server = await api<{ items: { productId: string }[] }>("cart");
      if (cancelled) return;
      if (server) {
        setItemIds(server.items.map((i) => i.productId));
      } else {
        try {
          const raw = window.localStorage.getItem(CART_KEY);
          setItemIds(raw ? JSON.parse(raw) : []);
        } catch {
          setItemIds([]);
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Guest fallback persistence — only while not signed in.
  useEffect(() => {
    if (!hydrated || getStoredAuthToken()) return;
    localStorage.setItem(CART_KEY, JSON.stringify(itemIds));
  }, [itemIds, hydrated]);

  // React to login/logout anywhere in the app.
  useEffect(() => {
    const sync = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        if (getStoredAuthToken()) {
          // Signed in: merge any guest cart into the server cart, then adopt it.
          let guestIds: string[] = [];
          try {
            const raw = localStorage.getItem(CART_KEY);
            guestIds = raw ? JSON.parse(raw) : [];
          } catch {
            guestIds = [];
          }
          const server = await api<{ items: { productId: string }[] }>("cart");
          const serverIds = server?.items.map((i) => i.productId) ?? [];
          const missing = guestIds.filter((id) => !serverIds.includes(id) && getCatalogProduct(id));
          for (const id of missing) {
            const product = getCatalogProduct(id)!;
            await api("cart/items", {
              method: "POST",
              body: JSON.stringify({
                productId: product.id,
                productType: product.productType,
                title: product.name,
                price: product.price,
                currency: "USD",
              }),
            });
          }
          const merged = await api<{ items: { productId: string }[] }>("cart");
          setItemIds(merged?.items.map((i) => i.productId) ?? [...serverIds, ...missing]);
          localStorage.removeItem(CART_KEY);
        } else {
          // Signed out: keep current items as the guest cart.
          localStorage.setItem(CART_KEY, JSON.stringify(itemIds));
        }
      } finally {
        syncingRef.current = false;
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds]);

  const addProduct = useCallback((product: CatalogProduct) => {
    if (!product) return;
    setItemIds((ids) => (ids.includes(product.id) ? ids : [...ids, product.id]));
    if (getStoredAuthToken()) {
      void api("cart/items", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          productType: product.productType,
          title: product.name,
          price: product.price,
          currency: product.currency ?? "USD",
        }),
      });
    }
  }, []);

  const addItem = useCallback(
    (blueprintId: string) => {
      const product = getCatalogProduct(blueprintId);
      if (product) addProduct(product);
    },
    [addProduct]
  );

  const removeItem = useCallback((blueprintId: string) => {
    setItemIds((ids) => ids.filter((id) => id !== blueprintId));
    if (getStoredAuthToken()) {
      void api(`cart/items/${encodeURIComponent(blueprintId)}`, { method: "DELETE" });
    }
  }, []);

  const clear = useCallback(() => {
    setItemIds([]);
    if (getStoredAuthToken()) {
      void api("cart", { method: "DELETE" });
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }, []);

  const isInCart = useCallback((productId: string) => itemIds.includes(productId), [itemIds]);

  const subtotal = useMemo(
    () => itemIds.reduce((sum, id) => sum + (getCatalogProduct(id)?.price ?? 0), 0),
    [itemIds]
  );

  const value: CartContextValue = {
    itemIds,
    addProduct,
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

/** Convenience: resolved catalog products for whatever's currently in the cart. */
export function useCartItems() {
  const { itemIds } = useCart();
  return useMemo(
    () => itemIds.map((id) => getCatalogProduct(id)).filter(Boolean) as CatalogProduct[],
    [itemIds]
  );
}
