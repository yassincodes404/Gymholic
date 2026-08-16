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

export function getCatalogProduct(id: string, academyPrice?: number): CatalogProduct | null {
  if (id === ACADEMY_MEMBERSHIP_ID) return academyMembershipProduct(academyPrice);
  return blueprintProducts.find((p) => p.id === id) ?? null;
}
