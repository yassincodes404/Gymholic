import type { ConsultationService } from "@/lib/consultations";
import { buildBackendApiUrl } from "@/lib/api";

export type BookingPricing = {
  currency: string;
  strategyCall: number;
  inPerson: number;
  openSession: number;
  academyMembershipPrice?: number;
  academyPrePurchaseEnabled?: boolean;
  /** False hides the free 3-hour time session from the book page. */
  freeSessionEnabled?: boolean;
};

/**
 * Live booking prices from GET /api/settings/pricing (public). These are the
 * admin-managed values (Admin → Settings); when the admin changes a price,
 * the website shows and charges the new amount immediately. All services are
 * paid, including the open time session.
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
  return services.map((service) => {
    if (service.id === "strategy-call") {
      return { ...service, price: pricing.strategyCall, currency: pricing.currency ?? service.currency };
    }
    if (service.id === "in-person") {
      return { ...service, price: pricing.inPerson, currency: pricing.currency ?? service.currency };
    }
    if (service.id === "discovery-call") {
      return { ...service, price: pricing.openSession, currency: pricing.currency ?? service.currency };
    }
    if (service.id === "free-session") {
      return { ...service, price: 0, currency: pricing.currency ?? service.currency };
    }
    return service;
  });
}

/** Drops the free time session when the backend says it is disabled. */
export function filterDisabledServices(
  services: ConsultationService[],
  pricing: BookingPricing | null
): ConsultationService[] {
  if (!pricing || pricing.freeSessionEnabled !== false) return services;
  return services.filter((service) => service.id !== "free-session");
}
