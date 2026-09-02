/*!
  GymHolic Admin Support — the client support inbox. Messages submitted
  from /contact land here (and are emailed to ADMIN_NOTIFY_EMAIL); each is
  persisted so nothing is lost, and resolved ones stay as the paper trail.
*/

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/adminApi";

interface SupportMessage {
  id: number;
  name: string | null;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING: "Booking & scheduling",
  PAYMENT: "Payment & refund",
  DIGITAL_PRODUCT: "Digital product",
  ACCOUNT: "Account",
  OTHER: "General",
};

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<"NEW" | "RESOLVED" | "ALL">("NEW");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(filter = statusFilter) {
    setLoading(true);
    try {
      const data = await adminFetch<SupportMessage[]>(`support?status=${filter}`);
      setMessages(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function resolve(id: number) {
    setError(null);
    try {
      await adminFetch(`support/${id}/resolve`, { method: "PUT" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark the message as resolved.");
    }
  }

  function mailto(message: SupportMessage) {
    return `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject} — Gymholic`)}`;
  }

  return (
    <AdminShell activeHref="/admin/support">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-paper/60 text-sm mt-1">
            Messages from /contact — reply by email, then mark as resolved.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-paper/10 rounded-full p-1">
          {(["NEW", "RESOLVED", "ALL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === f ? "bg-orange text-void font-semibold" : "text-paper/60 hover:text-paper"
              }`}
            >
              {f === "NEW" ? "Open" : f === "RESOLVED" ? "Resolved" : "All"}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">{notice}</div>
      )}
      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <p className="text-paper/60">Loading messages…</p>
      ) : messages.length === 0 ? (
        <div className="bg-surface border border-paper/10 rounded-xl p-10 text-center text-paper/60">
          No {statusFilter === "NEW" ? "open " : ""}support messages.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="bg-surface border border-paper/10 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {m.subject}
                    <span className="text-xs font-normal text-paper/40 ml-2">#{m.id}</span>
                  </p>
                  <p className="text-xs text-paper/50 mt-0.5">
                    {m.name || "—"} · <a href={mailto(m)} className="text-orange hover:underline">{m.email}</a> ·{" "}
                    {m.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.status === "NEW" ? (
                    <span className="text-[10px] uppercase tracking-wider bg-orange/15 text-orange px-2 py-1 rounded-full">
                      Open
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full">
                      Resolved
                    </span>
                  )}
                  {m.status === "NEW" && (
                    <button
                      onClick={() => resolve(m.id)}
                      className="admin-btn admin-btn-ghost !px-3 !py-1.5 !text-xs"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-paper/80 whitespace-pre-line">{m.message}</p>
              <p className="text-xs text-paper/40 mt-3">
                {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"} ·{" "}
                <a href={mailto(m)} className="underline hover:no-underline text-paper/60">
                  Reply by email
                </a>
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
