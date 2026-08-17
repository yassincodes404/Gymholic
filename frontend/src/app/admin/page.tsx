/*!
  GymHolic Admin Dashboard — real data from GET /api/dashboard/stats (Spring Boot).
*/

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { BarChart, StatusBreakdown } from "@/components/admin/charts";
import { buildBackendApiUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";

interface BookingSummary {
  id: number;
  startTime: string;
  clientName: string;
  clientEmail: string;
  status: string;
  meetLink: string | null;
}

interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  todaysConsultations: number;
  upcomingConsultations: number;
  completedSessions: number;
  cancelledBookings: number;
  cancellationRate: number;
  revenue: number;
  noShows?: number;
  refundDue?: number;
  recentNoShows?: {
    id: number;
    clientName: string;
    clientEmail: string;
    startTime: string;
    expertAttended: boolean | null;
    refundDue: boolean;
    rescheduleCount: number;
  }[];
  todaysBookings: BookingSummary[];
  upcomingBookings: BookingSummary[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<{
    revenueByDay: { date: string; total: number }[];
    bookingsByStatus: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch(buildBackendApiUrl("dashboard/stats"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(buildBackendApiUrl("dashboard/analytics"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const statsPayload = await statsRes.json();
        if (!statsRes.ok || !statsPayload?.success) {
          throw new Error(statsPayload?.message || "Failed to load stats.");
        }
        if (!cancelled) setStats(statsPayload.data as DashboardStats);
        const analyticsPayload = await analyticsRes.json().catch(() => null);
        if (analyticsRes.ok && analyticsPayload?.success && !cancelled) {
          setAnalytics(analyticsPayload.data);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load stats.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell activeHref="/admin">
      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-paper/60">Loading stats…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Today's Consultations", value: stats?.todaysConsultations ?? 0 },
              { label: "Upcoming", value: stats?.upcomingConsultations ?? 0 },
              { label: "Revenue", value: `$${stats?.revenue ?? 0}` },
              { label: "Completed Sessions", value: stats?.completedSessions ?? 0 },
              { label: "Cancellation Rate", value: `${stats?.cancellationRate ?? 0}%` },
              { label: "Total Customers", value: stats?.totalUsers ?? 0 },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface border border-paper/10 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-paper/50 mb-2">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            ))}
          </section>

          {((stats?.refundDue ?? 0) > 0 || (stats?.noShows ?? 0) > 0) && (
            <section className="grid lg:grid-cols-3 gap-4 mb-6">
              <div className={`rounded-xl p-5 border ${
                (stats?.refundDue ?? 0) > 0
                  ? "bg-red-950/40 border-red-900"
                  : "bg-surface border-paper/10"
              }`}>
                <p className="text-xs uppercase tracking-wider text-paper/50 mb-2">Refunds due</p>
                <p className="text-2xl font-bold text-red-300">{stats?.refundDue ?? 0}</p>
                <p className="text-xs text-paper/50 mt-2">
                  Sessions the expert missed — clients are owed a refund or a free rebooking.
                </p>
              </div>
              <div className="bg-surface border border-paper/10 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-paper/50 mb-2">No-shows (total)</p>
                <p className="text-2xl font-bold">{stats?.noShows ?? 0}</p>
                <p className="text-xs text-paper/50 mt-2">
                  Missed sessions. Clients get an automated reschedule email.
                </p>
              </div>
              <div className="bg-surface border border-paper/10 rounded-xl p-5 overflow-hidden">
                <p className="text-xs uppercase tracking-wider text-paper/50 mb-3">Recent no-shows</p>
                {(stats?.recentNoShows?.length ?? 0) === 0 ? (
                  <p className="text-xs text-paper/40">None recorded.</p>
                ) : (
                  <ul className="text-xs space-y-2">
                    {stats!.recentNoShows!.slice(0, 3).map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{n.clientName}</span>
                        <span className={n.refundDue ? "text-red-300" : "text-paper/50"} whitespace-nowrap>
                          {n.refundDue ? "Expert missed — refund" : "Client missed"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          <section className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface border border-paper/10 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Revenue — last 14 days</h2>
              <BarChart
                data={(analytics?.revenueByDay ?? []).map((d) => ({ label: d.date.slice(5), value: d.total }))}
                valueFormat={(v) => `${v}`}
              />
            </div>
            <div className="bg-surface border border-paper/10 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Bookings by status</h2>
              <StatusBreakdown counts={analytics?.bookingsByStatus ?? {}} />
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-paper/10 rounded-xl overflow-hidden">
              <h2 className="font-semibold px-5 py-4 border-b border-paper/10">Today&apos;s Consultations</h2>
              {(stats?.todaysBookings?.length ?? 0) === 0 ? (
                <p className="text-paper/50 text-sm px-5 py-8 text-center">No consultations today.</p>
              ) : (
                <ul className="divide-y divide-paper/10">
                  {stats!.todaysBookings.map((b) => (
                    <li key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{b.clientName}</p>
                        <p className="text-xs text-paper/50">{formatTime(b.startTime)} · {b.status}</p>
                      </div>
                      {b.meetLink && (
                        <a href={b.meetLink} target="_blank" rel="noreferrer"
                          className="text-sm bg-orange text-void font-medium rounded-lg px-3 py-1.5 hover:bg-orange/90">
                          Meet
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-surface border border-paper/10 rounded-xl overflow-hidden">
              <h2 className="font-semibold px-5 py-4 border-b border-paper/10">Upcoming Consultations</h2>
              {(stats?.upcomingBookings?.length ?? 0) === 0 ? (
                <p className="text-paper/50 text-sm px-5 py-8 text-center">No upcoming consultations.</p>
              ) : (
                <ul className="divide-y divide-paper/10">
                  {stats!.upcomingBookings.map((b) => (
                    <li key={b.id} className="px-5 py-4">
                      <p className="font-medium">{b.clientName}</p>
                      <p className="text-xs text-paper/50">{formatTime(b.startTime)} · {b.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mt-10">
            <Link href="/admin/products"
              className="block bg-surface border border-dashed border-paper/15 rounded-xl p-6 hover:border-orange/60 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold mb-1">Products</h2>
                  <p className="text-sm text-paper/60">
                    Courses, downloadable PDFs and physical products — sellable
                    inventory for the Academy and Blueprints store.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wider bg-paper/10 text-paper/60 px-3 py-1.5 rounded-full whitespace-nowrap">
                  Coming Soon
                </span>
              </div>
            </Link>
          </section>

          <p className="text-paper/40 text-sm mt-8">
            All operational pages are live.{" "}
            <Link href="/admin/integrations" className="underline hover:no-underline">
              Connect Google Calendar
            </Link>{" "}
            to enable Meet links, or{" "}
            <Link href="/" className="underline hover:no-underline">back to website</Link>.
          </p>
        </>
      )}
    </AdminShell>
  );
}
