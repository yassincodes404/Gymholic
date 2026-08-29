/*!
  GymHolic Admin API helpers — authenticated fetches against the Spring Boot backend.
*/

import { buildBackendApiUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAuthToken();
  const res = await fetch(buildBackendApiUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }
  return payload.data as T;
}

/** The admin's own user id — used for trainer-scoped endpoints (bookings, availability). */
export function getAdminUserId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("gymholic_user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.userId ?? parsed?.id ?? null;
  } catch {
    return null;
  }
}

/** Multipart upload (cover images / PDFs) with the admin bearer token. */
export async function adminUpload<T>(path: string, file: File): Promise<T> {
  const token = getStoredAuthToken();
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(buildBackendApiUrl(path), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || `Upload failed (${res.status})`);
  }
  return payload.data as T;
}

export interface StoreCategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface StoreProductRow {
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
  active: boolean;
  category: { name: string; slug: string } | null;
}

export interface TrainerBooking {
  id: number;
  clientId: number;
  clientName: string;
  trainerId: number;
  trainerName: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  meetLink: string | null;
  notes: string | null;
  expertAttended?: boolean | null;
  rescheduleCount?: number;
}

export interface AdminUserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "TRAINER" | "CLIENT";
  active: boolean;
  createdAt: string;
}

export interface AvailabilityRow {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
  specificDate: string | null;
}
