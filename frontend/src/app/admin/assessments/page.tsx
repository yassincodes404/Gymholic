/*!
  GymHolic Admin Assessments — real list from GET /api/v1/assessments (ADMIN only).
*/

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/adminApi";

interface AssessmentRow {
  id: string;
  userType?: string;
  currentStage?: string;
  situation?: string;
  startTiming?: string;
  preferredConsultation?: string;
  preferredLanguage?: string;
  fullName?: string;
  whatsapp?: string;
  email?: string;
  status?: string;
  createdAt?: string;
}

function pretty(value?: string | null) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ content: AssessmentRow[] }>("v1/assessments?size=100")
      .then((data) => setAssessments(data.content ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load assessments."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell activeHref="/admin/assessments">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Assessments</h1>

      {error && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <p className="text-neutral-400">Loading assessments…</p>
      ) : assessments.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center text-neutral-400">
          No assessments submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <div key={a.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenId(openId === a.id ? null : a.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
              >
                <div>
                  <p className="font-medium">{a.fullName || a.email || "Unknown"}</p>
                  <p className="text-xs text-neutral-500">
                    {pretty(a.userType)} · {a.email ?? "no email"} · {pretty(a.status)}
                  </p>
                </div>
                <span className="text-neutral-500 text-sm">{openId === a.id ? "▲" : "▼"}</span>
              </button>
              {openId === a.id && (
                <dl className="px-5 pb-5 grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm border-t border-neutral-800 pt-4">
                  <div>
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">Business Stage</dt>
                    <dd>{pretty(a.currentStage)}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">Timing</dt>
                    <dd>{pretty(a.startTiming)}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">Meeting Preference</dt>
                    <dd>{pretty(a.preferredConsultation)}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">Language</dt>
                    <dd>{pretty(a.preferredLanguage)}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">WhatsApp</dt>
                    <dd>{a.whatsapp ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">Submitted</dt>
                    <dd>{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-neutral-500 text-xs uppercase tracking-wider">Situation</dt>
                    <dd className="text-neutral-300 whitespace-pre-wrap">{a.situation || "—"}</dd>
                  </div>
                </dl>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
