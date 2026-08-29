/*!
 * GymHolic Store client — the Blueprint library on the Spring Boot backend
 * (GET /api/store/**). Products/categories are cached at module level (and
 * mirrored into lib/catalog so cart/checkout resolve them); when the backend
 * is unreachable the mock blueprints act as a fallback so nothing breaks in
 * dev without a backend.
 */

import { buildBackendApiUrl } from "@/lib/api";
import { blueprints, blueprintCategories } from "@/lib/blueprints";
import { registerStoreProducts } from "@/lib/catalog";

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
};

export type StoreProduct = {
  id: number;
  slug: string;
  title: string;
  shortDescription: string | null;
  price: number;
  currency: string;
  isFree: boolean;
  featured: boolean;
  hasCover: boolean;
  hasPdf: boolean;
  category: { name: string; slug: string } | null;
};

export type StoreProductDetail = StoreProduct & {
  description: string | null;
  related: StoreProduct[];
};

export type StoreLibraryItem = StoreProduct & { owned: boolean };

/** Fallback shapes built from the mock catalogue (backend offline / empty). */
function mockStoreProducts(): StoreProduct[] {
  return blueprints.map((b, i) => ({
    id: -(i + 1),
    slug: b.id,
    title: b.name,
    shortDescription: b.description,
    price: b.price,
    currency: "USD",
    isFree: false,
    featured: i < 2,
    hasCover: false,
    hasPdf: false,
    category: { name: b.category, slug: b.category.toLowerCase() },
  }));
}

function mockStoreCategories(): StoreCategory[] {
  return blueprintCategories.map((name, i) => ({
    id: -(i + 1),
    name,
    slug: name.toLowerCase(),
  }));
}

let categoriesCache: StoreCategory[] | null = null;
let categoriesPromise: Promise<StoreCategory[]> | null = null;
let productsCache: StoreProduct[] | null = null;
let productsPromise: Promise<StoreProduct[]> | null = null;
let storeFallback = false;

/** True when the last load couldn't reach the real store (mock data in use). */
export function isStoreFallback(): boolean {
  return storeFallback;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(buildBackendApiUrl(path));
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return null;
    return payload.data as T;
  } catch {
    return null;
  }
}

/** Active categories, sorted; falls back to the mock categories when offline. */
export async function fetchStoreCategories(): Promise<StoreCategory[]> {
  if (categoriesCache) return categoriesCache;
  if (!categoriesPromise) {
    categoriesPromise = getJson<StoreCategory[]>("store/categories").then((data) => {
      storeFallback = !data || data.length === 0;
      const resolved = data && data.length > 0 ? data : mockStoreCategories();
      categoriesCache = resolved;
      return resolved;
    });
  }
  return categoriesPromise;
}

/**
 * All active store products (registered into the catalog for cart/checkout).
 * Falls back to the mock blueprints so dev works without the backend.
 */
export async function ensureStoreProductsLoaded(): Promise<StoreProduct[]> {
  if (productsCache) return productsCache;
  if (!productsPromise) {
    productsPromise = getJson<StoreProduct[]>("store/products").then((data) => {
      storeFallback = !data || data.length === 0;
      const resolved = data && data.length > 0 ? data : mockStoreProducts();
      registerStoreProducts(resolved);
      productsCache = resolved;
      return resolved;
    });
  }
  return productsPromise;
}

/** Full product detail (public) — null when unknown or unreachable. */
export async function fetchStoreProductDetail(slug: string): Promise<StoreProductDetail | null> {
  const detail = await getJson<StoreProductDetail>(`store/products/${encodeURIComponent(slug)}`);
  if (detail) {
    registerStoreProducts([detail, ...detail.related]);
  }
  return detail;
}

/** The signed-in user's library (free products + purchases); null when unreachable. */
export async function fetchStoreLibrary(token: string): Promise<StoreLibraryItem[] | null> {
  try {
    const res = await fetch(buildBackendApiUrl("store/library"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return null;
    return payload.data as StoreLibraryItem[];
  } catch {
    return null;
  }
}

export function storeCoverUrl(slug: string): string {
  return buildBackendApiUrl(`store/products/${encodeURIComponent(slug)}/cover`);
}

export function storePdfUrl(slug: string): string {
  return buildBackendApiUrl(`store/products/${encodeURIComponent(slug)}/pdf`);
}

/** Fetches the protected PDF as a blob using the stored bearer token. */
export async function fetchStorePdfBlob(slug: string, token: string): Promise<Blob> {
  const res = await fetch(storePdfUrl(slug), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Could not open this blueprint (${res.status}).`);
  }
  return res.blob();
}

/** Cover lines derived from the title when a product has no uploaded cover. */
export function coverLinesFromTitle(title: string): string[] {
  const words = title
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 2) return ["GYMHOLIC", ...words];
  return ["GYMHOLIC", words.slice(0, 2).join(" "), words.slice(2).join(" ")];
}
