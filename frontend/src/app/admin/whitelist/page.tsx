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
  GENERAL: "bg-paper/10 text-paper/75",
};

export default function AdminWhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
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

  async function notifyWhitelist(force: boolean) {
    const pending = entries.filter((e) => force || !e.notified).length;
    const label = force
      ? `Re-send the launch announcement to ALL ${entries.length} people on the whitelist?`
      : `Email the Academy launch announcement to ${pending} people on the whitelist?`;
    if (!window.confirm(label)) return;
    setNotifyBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await adminFetch<{ queued: number; alreadyNotified: number; total: number }>(
        `whitelist/notify${force ? "?force=true" : ""}`,
        { method: "POST" },
      );
      setNotice(
        `Launch announcement queued for ${res?.queued ?? 0} member(s)` +
          (res?.alreadyNotified ? ` — ${res.alreadyNotified} were already notified (skipped).` : "."),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue the launch emails.");
    } finally {
      setNotifyBusy(false);
    }
  }

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
          <p className="text-paper/60 text-sm mt-1">
            People to notify when Academy and upcoming features launch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-paper/60">{entries.length} signups</span>
          <button
            onClick={() => notifyWhitelist(false)}
            disabled={notifyBusy || loading || entries.length === 0}
            className="admin-btn admin-btn-primary disabled:opacity-50"
          >
            {notifyBusy ? "Queuing…" : "Notify launch"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">{notice}</div>
      )}
      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <p className="text-paper/60">Loading whitelist…</p>
      ) : entries.length === 0 ? (
        <div className="bg-surface border border-paper/10 rounded-xl p-10 text-center text-paper/60">
          No waitlist signups yet.
        </div>
      ) : (
        <div className="bg-surface border border-paper/10 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-paper/50 text-xs uppercase tracking-wider border-b border-paper/10">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Source</th>
                <th className="text-left px-5 py-3">Notified</th>
                <th className="text-left px-5 py-3">Signed Up</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/10">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-paper/5">
                  <td className="px-5 py-3 font-medium">{entry.name || "—"}</td>
                  <td className="px-5 py-3 text-paper/75">{entry.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SOURCE_STYLES[entry.source] ?? SOURCE_STYLES.GENERAL}`}>
                      {entry.source}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {entry.notified ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
                        Emailed
                      </span>
                    ) : (
                      <span className="text-xs text-paper/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-paper/60 text-xs">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {entry.notified && (
                      <button
                        onClick={() => notifyWhitelist(true)}
                        disabled={notifyBusy}
                        className="text-paper/60 text-xs border border-paper/15 rounded px-2 py-1 hover:bg-paper/5 mr-2 disabled:opacity-50"
                        title="Re-send the launch email to everyone, including those already notified"
                      >
                        Force re-send
                      </button>
                    )}
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
