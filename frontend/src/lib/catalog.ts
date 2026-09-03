import { blueprints } from "@/lib/blueprints";

/**
 * Everything the store can sell — blueprints today, the Academy membership
 * pre-purchase now, courses/PDFs/physical products later. One shape so the
 * cart, checkout and order history treat them all the same way.
 */
export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  currency: "USD";
  productType: "BLUEPRINT" | "ACADEMY";
  kindLabel: string;
  /** Optional cover art lines (blueprints render their mini cover). */
  coverLines?: string[];
};

export const ACADEMY_MEMBERSHIP_ID = "academy-membership";

/** Fallback price; the live one comes from GET /api/settings/pricing. */
export const ACADEMY_MEMBERSHIP_FALLBACK_PRICE = 29;

export function academyMembershipProduct(price = ACADEMY_MEMBERSHIP_FALLBACK_PRICE): CatalogProduct {
  return {
    id: ACADEMY_MEMBERSHIP_ID,
    name: "Gymholic Academy Membership — Early Access",
    price,
    currency: "USD",
    productType: "ACADEMY",
    kindLabel: "Academy Membership",
  };
}

const blueprintProducts: CatalogProduct[] = blueprints.map((b) => ({
  id: b.id,
  name: b.name,
  price: b.price,
  currency: "USD",
  productType: "BLUEPRINT",
  kindLabel: b.resourceType,
  coverLines: b.coverLines,
}));

/**
 * Maps a live store product (backend Blueprint) into the catalog shape the
 * cart, checkout and payment pages consume. Used both to register fetched
 * store products and at add-to-cart sites so a cart entry carries its own
 * name/price — new Blueprints must never depend on this module's registry
 * being fresh for checkout to price them.
 */
export function catalogProductFromStore(product: {
  slug: string;
  title: string;
  price: number;
  currency?: string;
  isFree?: boolean;
}): CatalogProduct {
  return {
    id: product.slug,
    name: product.title,
    price: product.isFree ? 0 : product.price,
    currency: "USD",
    productType: "BLUEPRINT",
    kindLabel: product.isFree ? "Free Blueprint" : "Blueprint",
  };
}

/**
 * Live store products (from lib/store.ts) registered at module level once
 * fetched, so cart ids added before the cart carried payloads (legacy
 * localStorage) still resolve, while falling back to the mock blueprints
 * before (or without) a backend.
 */
const storeProductsById = new Map<string, CatalogProduct>();

export function registerStoreProducts(products: {
  slug: string;
  title: string;
  price: number;
  currency?: string;
  isFree?: boolean;
}[]): void {
  for (const product of products) {
    storeProductsById.set(product.slug, catalogProductFromStore(product));
  }
}

export function getCatalogProduct(id: string, academyPrice?: number): CatalogProduct | null {
  if (id === ACADEMY_MEMBERSHIP_ID) return academyMembershipProduct(academyPrice);
  return storeProductsById.get(id) ?? blueprintProducts.find((p) => p.id === id) ?? null;
}
