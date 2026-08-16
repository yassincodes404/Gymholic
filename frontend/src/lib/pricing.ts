import type { ConsultationService } from "@/lib/consultations";
import { buildBackendApiUrl } from "@/lib/api";

export type BookingPricing = {
  currency: string;
  strategyCall: number;
  inPerson: number;
  discovery: number;
  freeConsultationEnabled?: boolean;
  academyMembershipPrice?: number;
  academyPrePurchaseEnabled?: boolean;
};

/**
 * Live booking prices from GET /api/settings/pricing (public). These are the
 * admin-managed values (Admin → Settings); when the admin changes a price,
 * the website shows and charges the new amount immediately.
 */
export async function fetchBookingPricing(): Promise<BookingPricing | null> {
  try {
    const res = await fetch(buildBackendApiUrl("settings/pricing"));
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return null;
    const data = payload.data as BookingPricing;
    if (!data || typeof data.strategyCall !== "number" || typeof data.inPerson !== "number") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Merge live prices into the service catalogue (ids stay stable). */
export function applyPricing(
  services: ConsultationService[],
  pricing: BookingPricing
): ConsultationService[] {
  const priced = services.map((service) => {
    if (service.id === "strategy-call") {
      return { ...service, price: pricing.strategyCall, currency: pricing.currency ?? service.currency, isFree: pricing.strategyCall <= 0 };
    }
    if (service.id === "in-person") {
      return { ...service, price: pricing.inPerson, currency: pricing.currency ?? service.currency, isFree: pricing.inPerson <= 0 };
    }
    return service; // free open consultation stays free
  });
  // The free open consultation can be switched off by the admin.
  if (pricing.freeConsultationEnabled === false) {
    return priced.filter((service) => !service.isFree);
  }
  return priced;
}
