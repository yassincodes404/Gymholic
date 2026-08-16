/*!
  GymHolic Admin Customers — real list from GET /api/users (ADMIN only).
*/

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch, type AdminUserRow } from "@/lib/adminApi";

const ROLE_STYLES: Record<AdminUserRow["role"], string> = {
  ADMIN: "bg-purple-500/15 text-purple-400",
  TRAINER: "bg-blue-500/15 text-blue-400",
  CLIENT: "bg-neutral-700/40 text-neutral-300",
};

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [carts, setCarts] = useState<Record<number, { count: number; subtotal: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminFetch<{ content: AdminUserRow[] }>("users?size=200")
      .then((data) => setUsers(data.content ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users."))
      .finally(() => setLoading(false));
    adminFetch<{ userId: number; items: unknown[]; subtotal: number }[]>("cart/admin")
      .then((data) => {
        const byUser: Record<number, { count: number; subtotal: number }> = {};
        for (const cart of data ?? []) {
          byUser[cart.userId] = { count: cart.items?.length ?? 0, subtotal: cart.subtotal ?? 0 };
        }
        setCarts(byUser);
      })
      .catch(() => setCarts({}));
  }, []);

  const filtered = users.filter(
    (u) =>
      !search ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell activeHref="/admin/customers">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-neutral-600"
        />
      </div>

      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <p className="text-neutral-400">Loading customers…</p>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Cart</th>
                <th className="text-left px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-800/40">
                  <td className="px-5 py-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-5 py-3 text-neutral-300">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLES[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-300 text-xs">
                    {carts[u.id]?.count
                      ? `${carts[u.id].count} item${carts[u.id].count > 1 ? "s" : ""} · $${carts[u.id].subtotal}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
