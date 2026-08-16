/*!
  GymHolic Admin Whitelist — waitlist signups from GET /api/whitelist (ADMIN only).
*/

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/adminApi";

interface WhitelistEntry {
  id: number;
  email: string;
  name: string | null;
  source: string;
  notified: boolean;
  createdAt: string;
}

const SOURCE_STYLES: Record<string, string> = {
  ACADEMY: "bg-purple-500/15 text-purple-400",
  ACADEMY_PREPURCHASE: "bg-emerald-500/15 text-emerald-400",
  BLUEPRINTS: "bg-blue-500/15 text-blue-400",
  GENERAL: "bg-neutral-700/40 text-neutral-300",
};

export default function AdminWhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await adminFetch<WhitelistEntry[]>("whitelist");
      setEntries(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load whitelist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    setError(null);
    try {
      await adminFetch(`whitelist/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove entry.");
    }
  }

  return (
    <AdminShell activeHref="/admin/whitelist">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Whitelist</h1>
          <p className="text-neutral-400 text-sm mt-1">
            People to notify when Academy and upcoming features launch.
          </p>
        </div>
        <span className="text-sm text-neutral-400">{entries.length} signups</span>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <p className="text-neutral-400">Loading whitelist…</p>
      ) : entries.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center text-neutral-400">
          No waitlist signups yet.
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Source</th>
                <th className="text-left px-5 py-3">Signed Up</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-neutral-800/40">
                  <td className="px-5 py-3 font-medium">{entry.name || "—"}</td>
                  <td className="px-5 py-3 text-neutral-300">{entry.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SOURCE_STYLES[entry.source] ?? SOURCE_STYLES.GENERAL}`}>
                      {entry.source}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(entry.id)}
                      className="text-red-400 text-xs border border-red-900 rounded px-2 py-1 hover:bg-red-950/50">
                      Remove
                    </button>
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
