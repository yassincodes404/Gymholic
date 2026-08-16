/*!
  GymHolic Admin Bookings — GET /api/bookings/trainer/{id} with the full
  lifecycle: confirm, complete (session ended/delivered), cancel, no-show
  (with reschedule + refund automation), and the booking details the client
  submitted (topic, phone, message…).
*/

"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch, getAdminUserId, type TrainerBooking } from "@/lib/adminApi";

const STATUS_STYLES: Record<TrainerBooking["status"], string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  CONFIRMED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-blue-500/15 text-blue-400",
  CANCELLED: "bg-red-500/15 text-red-400",
  NO_SHOW: "bg-neutral-500/15 text-neutral-400",
};

type ExtendedBooking = TrainerBooking & {
  rescheduleCount?: number;
  expertAttended?: boolean | null;
};

/** Booking notes are "Key: value" lines — turn them into a displayable map. */
function parseNotes(notes?: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  (notes ?? "").split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key && value) map[key] = value;
    }
  });
  return map;
}

const DETAIL_FIELDS: { key: string; label: string }[] = [
  { key: "Service", label: "Service" },
  { key: "Topic", label: "Consultation Topic" },
  { key: "Phone", label: "Phone" },
  { key: "WhatsApp", label: "WhatsApp" },
  { key: "Company", label: "Company" },
  { key: "Country", label: "Country" },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [noShowFor, setNoShowFor] = useState<ExtendedBooking | null>(null);
  const [expertAttended, setExpertAttended] = useState(true);
  const [noShowNote, setNoShowNote] = useState("");
  const [markingNoShow, setMarkingNoShow] = useState(false);

  const load = useCallback(async () => {
    const userId = getAdminUserId();
    if (!userId) return;
    try {
      const data = await adminFetch<{ content: ExtendedBooking[] }>(
        `bookings/trainer/${userId}?sort=startTime,desc&size=100`
      );
      setBookings(data.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: number, action: "confirm" | "cancel" | "complete") {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await adminFetch(`bookings/${id}/${action}`, { method: "PUT" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function markNoShow() {
    if (!noShowFor) return;
    setMarkingNoShow(true);
    setError(null);
    try {
      await adminFetch(`bookings/${noShowFor.id}/no-show`, {
        method: "PUT",
        body: JSON.stringify({ expertAttended, note: noShowNote || null }),
      });
      setNotice(
        expertAttended
          ? `Marked #${noShowFor.id} as no-show — the client was emailed a one-time reschedule link (payment kept as credit).`
          : `Marked #${noShowFor.id} as no-show — the client was offered a full refund or a free rebooking. Check your email for the refund task.`
      );
      setNoShowFor(null);
      setNoShowNote("");
      setExpertAttended(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark the no-show.");
    } finally {
      setMarkingNoShow(false);
    }
  }

  return (
    <AdminShell activeHref="/admin/bookings">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <button onClick={() => load()}
          className="text-sm border border-neutral-700 rounded-lg px-3 py-1.5 hover:bg-neutral-800 transition-colors">
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
      )}
      {notice && (
        <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">{notice}</div>
      )}

      {loading ? (
        <p className="text-neutral-400">Loading bookings…</p>
      ) : bookings.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center text-neutral-400">
          No bookings yet.
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-5 py-3">Date &amp; Time</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Meet</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {bookings.map((b) => {
                const details = parseNotes(b.notes);
                const refundDue = b.status === "NO_SHOW" && b.expertAttended === false;
                return (
                  <Fragment key={b.id}>
                    <tr className="hover:bg-neutral-800/40">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setOpenId(openId === b.id ? null : b.id)}
                          className="text-left"
                          title="Show booking details"
                        >
                          <p className="font-medium underline decoration-neutral-600 hover:decoration-neutral-300">
                            {b.clientName}
                          </p>
                          <p className="text-xs text-neutral-500">#{b.id}</p>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-neutral-300">
                        {new Date(b.startTime).toLocaleString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3 space-x-1.5 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[b.status]}`}>
                          {b.status === "COMPLETED" ? "ENDED" : b.status.replace("_", " ")}
                        </span>
                        {(b.rescheduleCount ?? 0) > 0 && (
                          <span className="text-[10px] uppercase tracking-wider bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full">
                            Rescheduled ×{b.rescheduleCount}
                          </span>
                        )}
                        {refundDue && (
                          <span className="text-[10px] uppercase tracking-wider bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                            Refund due
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {b.meetLink ? (
                          <a href={b.meetLink} target="_blank" rel="noreferrer" className="underline hover:no-underline">
                            Open
                          </a>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                        {b.status === "PENDING" && (
                          <button disabled={busyId === b.id} onClick={() => act(b.id, "confirm")}
                            className="bg-emerald-700/60 hover:bg-emerald-700 text-emerald-100 rounded-lg px-3 py-1 text-xs disabled:opacity-50">
                            Confirm
                          </button>
                        )}
                        {b.status === "CONFIRMED" && (
                          <button disabled={busyId === b.id} onClick={() => act(b.id, "complete")}
                            className="bg-blue-800/60 hover:bg-blue-800 text-blue-100 rounded-lg px-3 py-1 text-xs disabled:opacity-50">
                            Mark Ended
                          </button>
                        )}
                        {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                          <button disabled={busyId === b.id} onClick={() => act(b.id, "cancel")}
                            className="bg-red-900/60 hover:bg-red-900 text-red-200 rounded-lg px-3 py-1 text-xs disabled:opacity-50">
                            Cancel
                          </button>
                        )}
                        {(b.status === "CONFIRMED" || b.status === "COMPLETED") && (
                          <button disabled={busyId === b.id}
                            onClick={() => {
                              setExpertAttended(true);
                              setNoShowNote("");
                              setNoShowFor(b);
                            }}
                            className="bg-amber-900/60 hover:bg-amber-900 text-amber-200 rounded-lg px-3 py-1 text-xs disabled:opacity-50">
                            No-Show
                          </button>
                        )}
                      </td>
                    </tr>
                    {openId === b.id && (
                      <tr className="bg-neutral-950/60">
                        <td colSpan={5} className="px-5 py-4">
                          <dl className="grid md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                            {DETAIL_FIELDS.map(({ key, label }) => (
                              <div key={key}>
                                <dt className="text-neutral-500 text-[10px] uppercase tracking-wider mb-0.5">{label}</dt>
                                <dd className={details[key] ? "text-neutral-200" : "text-neutral-600"}>
                                  {details[key] ?? "—"}
                                </dd>
                              </div>
                            ))}
                            <div className="md:col-span-3">
                              <dt className="text-neutral-500 text-[10px] uppercase tracking-wider mb-0.5">
                                Client wants to discuss
                              </dt>
                              <dd className="text-neutral-200 whitespace-pre-wrap">
                                {details.Message ?? details.Topic ?? "—"}
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {noShowFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setNoShowFor(null)} />
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Mark session as no-show</h2>
              <p className="text-xs text-neutral-500 mt-1">
                #{noShowFor.id} · {noShowFor.clientName} ·{" "}
                {new Date(noShowFor.startTime).toLocaleString(undefined, {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>

            <p className="text-sm text-neutral-400">
              The client is emailed automatically with a one-time link to pick a
              new time. What they&apos;re offered depends on whether you attended:
            </p>

            <label className="flex items-start gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={expertAttended}
                onChange={(e) => setExpertAttended(e.target.checked)}
                className="h-4 w-4 mt-0.5 accent-white"
              />
              <span>
                The expert joined the session
                <span className="block text-xs text-neutral-500 mt-0.5">
                  {expertAttended
                    ? "Client keeps their payment as credit and gets a reschedule link."
                    : "Client is offered a full refund or a free rebooking, and you get a refund task by email."}
                </span>
              </span>
            </label>

            <label className="block text-sm">
              <span className="text-neutral-300 block mb-1.5">Note (internal, optional)</span>
              <textarea
                value={noShowNote}
                onChange={(e) => setNoShowNote(e.target.value)}
                rows={2}
                placeholder="e.g. waited 20 minutes in the Meet room"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600"
              />
            </label>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setNoShowFor(null)}
                className="border border-neutral-700 rounded-lg px-4 py-2 text-sm hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={markNoShow}
                disabled={markingNoShow}
                className="bg-white text-neutral-950 font-semibold rounded-lg px-4 py-2 text-sm hover:bg-neutral-200 disabled:opacity-50"
              >
                {markingNoShow ? "Marking…" : "Mark as No-Show & Email Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
