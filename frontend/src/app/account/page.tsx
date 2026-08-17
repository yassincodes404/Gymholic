/*!
  GymHolic Customer Account — profile (GET /api/users/me), bookings
  (GET /api/bookings/client/{id}) and full payment history
  (GET /api/payments/me + GET /api/orders) for the signed-in client.
*/

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildBackendApiUrl } from "@/lib/api";
import { fetchCurrentUser, getStoredAuthToken, logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

interface BookingItem {
  id: number;
  startTime: string;
  endTime: string;
  trainerName: string;
  meetingTimezone?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  meetLink: string | null;
}

interface PaymentEntry {
  key: string;
  kind: "CONSULTATION_PAYMENT" | "FREE_CONSULTATION" | "ORDER";
  refId: number;
  title: string;
  amount: number;
  currency: string;
  status: string;
  providerName: string;
  occurredAt: string;
}

const KIND_LABELS: Record<PaymentEntry["kind"], string> = {
  CONSULTATION_PAYMENT: "Consultation",
  FREE_CONSULTATION: "Free Consultation",
  ORDER: "Product order",
};

const BOOKING_STATUS_STYLES: Record<BookingItem["status"], string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  CONFIRMED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-blue-500/15 text-blue-400",
  CANCELLED: "bg-red-500/15 text-red-400",
  NO_SHOW: "bg-paper/10 text-paper/60",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  PENDING: "bg-amber-500/15 text-amber-400",
  FAILED: "bg-red-500/15 text-red-400",
  REFUNDED: "bg-blue-500/15 text-blue-400",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Consultation payments + free bookings + product orders, newest first. */
function buildHistory(entries: PaymentEntry[]): PaymentEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [history, setHistory] = useState<PaymentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const current = await fetchCurrentUser(token);
      if (cancelled) return;
      if (!current) {
        logout();
        router.replace("/login");
        return;
      }
      setUser(current);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [bookingsRes, historyRes] = await Promise.all([
          fetch(
            buildBackendApiUrl(`bookings/client/${current.userId}?sort=startTime,desc`),
            { headers }
          ),
          fetch(buildBackendApiUrl("account/history"), { headers }).catch(() => null),
        ]);

        const bookingsPayload = await bookingsRes.json();
        if (!bookingsRes.ok || !bookingsPayload?.success) {
          throw new Error(bookingsPayload?.message || "Failed to load bookings.");
        }
        if (cancelled) return;
        setBookings(bookingsPayload.data?.content ?? []);

        // Unified purchase history (paid + free consultations, product
        // orders) — best-effort, a failure shouldn't break the page.
        const entries: PaymentEntry[] = [];
        if (historyRes?.ok) {
          const payload = await historyRes.json().catch(() => null);
          if (payload?.success && Array.isArray(payload.data)) entries.push(...payload.data);
        }
        if (!cancelled) setHistory(buildHistory(entries));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load account data.");
      } finally {
        if (!cancelled) {
          setLoadedAt(Date.now());
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const upcoming = loadedAt
    ? bookings.filter(
        (b) => (b.status === "CONFIRMED" || b.status === "PENDING") && new Date(b.startTime).getTime() >= loadedAt
      )
    : [];
  const past = bookings.filter((b) => !upcoming.includes(b));

  if (loading) {
    return (
      <main className="min-h-screen bg-void text-paper flex items-center justify-center">
        <p className="text-paper/60">Loading your account…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void text-paper px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back{user ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-paper/60 mt-1">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/book"
              className="bg-orange text-void font-medium rounded-full px-5 py-2 hover:bg-orange/90 transition-colors">
              Book a Call
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="border border-paper/15 rounded-lg px-4 py-2 hover:bg-paper/10 transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
        )}

        {upcoming.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-4">Next consultation</h2>
            {upcoming.map((b) => (
              <div key={b.id}
                className="bg-surface border border-paper/10 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-lg">{formatWhen(b.startTime)}</p>
                  <p className="text-sm text-paper/60">
                    with {b.trainerName} · 45 min
                    {b.meetingTimezone ? ` · ${b.meetingTimezone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BOOKING_STATUS_STYLES[b.status]}`}>
                    {b.status}
                  </span>
                  {b.status === "CONFIRMED" && b.meetLink && (
                    <a href={b.meetLink} target="_blank" rel="noreferrer"
                      className="bg-orange text-void font-medium rounded-full px-5 py-2 hover:bg-orange/90 transition-colors">
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-4">Payment history</h2>
          {history.length === 0 ? (
            <div className="bg-surface border border-paper/10 rounded-xl p-10 text-center">
              <p className="text-paper/60">No payments yet.</p>
              <p className="text-xs text-paper/40 mt-2">
                Consultations and products you purchase will be listed here with their receipts.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {history.map((row) => (
                <li key={row.key}
                  className="bg-surface border border-paper/10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{row.title}</p>
                    <p className="text-xs text-paper/50 mt-0.5">
                      {formatWhen(row.occurredAt)} · {KIND_LABELS[row.kind] ?? row.kind} · via {row.providerName || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {row.amount > 0 ? formatMoney(row.amount, row.currency) : "Free"}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAYMENT_STATUS_STYLES[row.status] ?? "bg-paper/10 text-paper/75"}`}>
                      {row.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-4">Booking history</h2>
          {past.length === 0 ? (
            <div className="bg-surface border border-paper/10 rounded-xl p-10 text-center">
              <p className="text-paper/60">
                {bookings.length === 0
                  ? "You have no bookings yet."
                  : "No past bookings."}
              </p>
              {bookings.length === 0 && (
                <Link href="/book" className="inline-block mt-4 underline hover:no-underline">
                  Book your first consultation
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {past.map((b) => (
                <li key={b.id}
                  className="bg-surface border border-paper/10 rounded-xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{formatWhen(b.startTime)}</p>
                    <p className="text-xs text-paper/50">with {b.trainerName}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BOOKING_STATUS_STYLES[b.status]}`}>
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
