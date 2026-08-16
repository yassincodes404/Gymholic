/*!
  GymHolic Admin Availability — weekly working hours from GET /api/availability/trainer/{id}
  with add/remove (POST /api/availability, DELETE /api/availability/{id}).
*/

"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch, getAdminUserId, type AvailabilityRow } from "@/lib/adminApi";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function AdminAvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const userId = getAdminUserId();
    if (!userId) return;
    try {
      const data = await adminFetch<AvailabilityRow[]>(`availability/trainer/${userId}`);
      setRows(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminFetch("availability", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime + ":00",
          endTime: form.endTime + ":00",
          recurring: true,
        }),
      });
      setNotice(`Added ${form.dayOfWeek} ${form.startTime}–${form.endTime}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add availability.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setError(null);
    try {
      await adminFetch(`availability/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove availability.");
    }
  }

  const inputCls =
    "bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600";

  return (
    <AdminShell activeHref="/admin/availability">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Availability</h1>
      <p className="text-neutral-400 text-sm mb-6">
        Working hours customers can book. 45-minute consultations with a 5-minute buffer
        are generated automatically inside these windows.
      </p>

      {error && <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>}
      {notice && <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">{notice}</div>}

      {loading ? (
        <p className="text-neutral-400">Loading availability…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {DAYS.map((day) => {
              const dayRows = rows.filter((r) => r.dayOfWeek === day);
              return (
                <div key={day} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                    {day.slice(0, 3)} · {dayRows.length > 0 ? `${dayRows.length} window${dayRows.length > 1 ? "s" : ""}` : "closed"}
                  </h2>
                  {dayRows.length === 0 ? (
                    <p className="text-neutral-600 text-sm">Not bookable</p>
                  ) : (
                    <ul className="space-y-2">
                      {dayRows.map((r) => (
                        <li key={r.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono">
                            {r.startTime.slice(0, 5)} — {r.endTime.slice(0, 5)}
                          </span>
                          <button onClick={() => remove(r.id)}
                            className="text-red-400 text-xs border border-red-900 rounded px-2 py-0.5 hover:bg-red-950/50">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={addSlot} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-fit space-y-4">
            <h2 className="font-semibold">Add working hours</h2>
            <label className="block text-sm">
              <span className="text-neutral-400 block mb-1.5">Day</span>
              <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                className={inputCls + " w-full"}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-neutral-400 block mb-1.5">Start</span>
                <input type="time" value={form.startTime} required
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls + " w-full"} />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-400 block mb-1.5">End</span>
                <input type="time" value={form.endTime} required
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls + " w-full"} />
              </label>
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-white text-neutral-950 font-semibold rounded-lg py-2.5 text-sm hover:bg-neutral-200 disabled:opacity-50">
              {saving ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}
