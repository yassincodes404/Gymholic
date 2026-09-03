"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getCatalogProduct, type CatalogProduct } from "@/lib/catalog";
import { buildBackendApiUrl } from "@/lib/api";
import { ensureStoreProductsLoaded } from "@/lib/store";
import { AUTH_CHANGED_EVENT, getStoredAuthToken } from "@/lib/auth";

const CART_KEY = "gymholic-cart";

/**
 * A cart line that carries its own name/price/type — either snapshotted at
 * add-to-cart time or adopted from the server cart row. Entries never
 * re-resolve against the client-side product catalog for pricing, so
 * Blueprints added to the store after this page loaded (whose ids no local
 * registry knows) still check out correctly.
 */
export type CartEntry = CatalogProduct & { coverLines?: string[] };

type ServerCartItem = {
  productId: string;
  productType?: string;
  title?: string;
  price?: number | string;
  currency?: string;
};

/** GET /api/cart returns the whole CartDto (items + subtotal + count), not a bare list. */
type ServerCart = { items?: ServerCartItem[] | null };

type CartContextValue = {
  /** Self-contained cart lines (name/price ride with the entry). */
  items: CartEntry[];
  itemIds: string[];
  /** True once the cart has been loaded (server cart for members, localStorage for guests). */
  hydrated: boolean;
  /** Adds any catalog product (blueprint, Academy membership, future courses). */
  addProduct: (product: CatalogProduct) => void;
  /** Blueprint shorthand: resolves the id against the product catalog. */
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

/** Server cart row → self-contained entry (server title/price are canonical). */
function entryFromServerItem(item: ServerCartItem): CartEntry {
  const productType = item.productType === "ACADEMY" ? "ACADEMY" : "BLUEPRINT";
  return {
    id: item.productId,
    name: item.title ?? item.productId,
    price: Number(item.price) || 0,
    currency: "USD",
    productType,
    kindLabel: productType === "ACADEMY" ? "Academy Membership" : "Blueprint",
  };
}

/** Guest localStorage: entry objects today; bare ids from older builds are
 *  resolved against the catalog once and then upgraded. Unresolvable ids
 *  (e.g. a Blueprint deleted from the store) are dropped. */
function loadGuestCart(): CartEntry[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.every((e) => !!e && typeof e === "object" && typeof (e as CartEntry).id === "string")) {
      return parsed as CartEntry[];
    }
    return parsed
      .filter((id): id is string => typeof id === "string")
      .map((id) => getCatalogProduct(id))
      .filter((p): p is CatalogProduct => p !== null);
  } catch {
    return [];
  }
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
  const [items, setItems] = useState<CartEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const syncingRef = useRef(false);

  // Initial load: server cart when signed in, localStorage otherwise. Store
  // products are loaded first so legacy bare-id guest carts still resolve.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureStoreProductsLoaded().catch(() => null);
      if (cancelled) return;
      const server = await api<ServerCart>("cart");
      if (cancelled) return;
      if (server) {
        setItems((server.items ?? []).map(entryFromServerItem));
      } else {
        setItems(loadGuestCart());
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
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // React to login/logout anywhere in the app.
  useEffect(() => {
    const sync = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        if (getStoredAuthToken()) {
          // Signed in: merge any guest cart into the server cart, then adopt it.
          const guestEntries = loadGuestCart();
          const server = await api<ServerCart>("cart");
          const serverItems = server?.items ?? [];
          const serverIds = serverItems.map((i) => i.productId);
          const missing = guestEntries.filter((entry) => !serverIds.includes(entry.id));
          for (const entry of missing) {
            await api("cart/items", {
              method: "POST",
              body: JSON.stringify({
                productId: entry.id,
                productType: entry.productType,
                title: entry.name,
                price: entry.price,
                currency: "USD",
              }),
            });
          }
          const merged = await api<ServerCart>("cart");
          setItems((merged?.items ?? serverItems).map(entryFromServerItem));
          localStorage.removeItem(CART_KEY);
        } else {
          // Signed out: keep current items as the guest cart.
          localStorage.setItem(CART_KEY, JSON.stringify(items));
        }
      } finally {
        syncingRef.current = false;
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, [items]);

  const addProduct = useCallback((product: CatalogProduct) => {
    if (!product) return;
    setItems((current) => (current.some((i) => i.id === product.id) ? current : [...current, product]));
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

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((i) => i.id !== productId));
    if (getStoredAuthToken()) {
      void api(`cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" });
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    if (getStoredAuthToken()) {
      void api("cart", { method: "DELETE" });
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }, []);

  const isInCart = useCallback((productId: string) => items.some((i) => i.id === productId), [items]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const value: CartContextValue = {
    items,
    itemIds,
    hydrated,
    addProduct,
    addItem,
    removeItem,
    clear,
    isInCart,
    count: items.length,
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

/** The cart's line items — carried payloads, not catalog lookups. */
export function useCartItems(): CartEntry[] {
  const { items } = useCart();
  return items;
}

/**
 * Convenience hook mirroring the historical shape (item ids). Prefer
 * useCartItems(); this exists so call sites that only need ids keep compiling.
 */
export function useCartIds(): string[] {
  const { itemIds } = useCart();
  return itemIds;
}
