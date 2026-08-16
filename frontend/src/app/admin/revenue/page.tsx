/*!
  GymHolic Admin Revenue — KPIs from /api/dashboard/stats + daily revenue chart
  and booking status breakdown from /api/dashboard/analytics.
*/

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BarChart, StatusBreakdown } from "@/components/admin/charts";
import { adminFetch } from "@/lib/adminApi";

interface Stats {
  revenue: number;
  totalBookings: number;
  completedSessions: number;
  cancellationRate: number;
}

interface Analytics {
  revenueByDay: { date: string; total: number }[];
  bookingsByStatus: Record<string, number>;
}

export default function AdminRevenuePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminFetch<Stats>("dashboard/stats"),
      adminFetch<Analytics>("dashboard/analytics"),
    ])
      .then(([s, a]) => {
        setStats(s);
        setAnalytics(a);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load revenue data."));
  }, []);

  const chartData = (analytics?.revenueByDay ?? []).map((d) => ({
    label: d.date.slice(5),
    value: d.total,
  }));

  return (
    <AdminShell activeHref="/admin/revenue">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Revenue & Analytics</h1>

      {error && <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: `$${stats?.revenue ?? 0}` },
          { label: "Paid Bookings", value: stats?.totalBookings ?? 0 },
          { label: "Completed Sessions", value: stats?.completedSessions ?? 0 },
          { label: "Cancellation Rate", value: `${stats?.cancellationRate ?? 0}%` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">{kpi.label}</p>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Revenue — last 14 days</h2>
          <BarChart data={chartData} valueFormat={(v) => `${v}`} />
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Bookings by status</h2>
          <StatusBreakdown counts={analytics?.bookingsByStatus ?? {}} />
        </div>
      </section>
    </AdminShell>
  );
}
