/*!
  GymHolic Admin Settings — business settings persisted via GET/PUT /api/settings.
  Every field here is wired to live behavior (booking prices, feature flags,
  emails) — changes take effect on the website immediately.
*/

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/adminApi";

type SettingField = { key: string; label: string; hint?: string; type?: "text" | "toggle" };

const SETTING_GROUPS: { title: string; description: string; fields: SettingField[] }[] = [
  {
    title: "Consultation pricing (USD)",
    description: "Prices shown and charged on the website immediately — the server enforces them.",
    fields: [
      { key: "BOOKING_PRICE_STRATEGY_CALL", label: "45-Minute Strategy Call price (USD)" },
      { key: "BOOKING_PRICE_OPEN_SESSION", label: "Open Time Session price (USD)" },
      { key: "BOOKING_PRICE_IN_PERSON", label: "Private In-Person Consultation price (USD)" },
      { key: "BOOKING_CURRENCY", label: "Booking currency", hint: "Locked to USD — all charges are in US dollars" },
    ],
  },
  {
    title: "Academy membership",
    description: "Early-access pre-purchase on the Academy page until the library launches.",
    fields: [
      { key: "ACADEMY_MEMBERSHIP_PRICE", label: "Membership pre-purchase price (USD)" },
      { key: "ACADEMY_PRE_PURCHASE_ENABLED", label: "Allow pre-purchasing", type: "toggle" },
    ],
  },
  {
    title: "Emails & reminders",
    description: "Automated emails sent to clients and you around each session.",
    fields: [
      { key: "REMINDER_24H_ENABLED", label: "Send the 24-hour reminder", type: "toggle" },
      { key: "REMINDER_1H_ENABLED", label: "Send the 1-hour reminder", type: "toggle" },
      {
        key: "ADMIN_NOTIFY_EMAIL",
        label: "Admin notification email override",
        hint: "Where order/booking admin copies go. Empty = your admin account email.",
      },
    ],
  },
  {
    title: "Policies & scheduling",
    description: "Windows and durations enforced by the booking engine.",
    fields: [
      { key: "RESCHEDULE_WINDOW_DAYS", label: "No-show reschedule link validity (days)", hint: "Default 14" },
      { key: "CONSULTATION_DURATION_MINUTES", label: "Consultation duration (minutes)", hint: "Bookings enforce 45-minute slots" },
      { key: "CONSULTATION_BUFFER_MINUTES", label: "Buffer between consultations (minutes)" },
    ],
  },
];

const KNOWN_KEYS = SETTING_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<Record<string, string>>("settings")
      .then(setValues)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  function toggleToBool(value: string | undefined, fallback = false) {
    return (value ?? String(fallback)).toLowerCase() === "true";
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminFetch<Record<string, string>>("settings", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setValues(updated);
      setNotice("Settings saved — changes are live on the website.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell activeHref="/admin/settings">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Settings</h1>
      <p className="text-paper/60 text-sm mb-8">
        Core business configuration. Values are persisted server-side and
        shared across the booking engine, emails and the storefront.
      </p>

      {error && <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>}
      {notice && <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">{notice}</div>}

      {loading ? (
        <p className="text-paper/60">Loading settings…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {SETTING_GROUPS.map((group) => (
            <div key={group.title} className="bg-surface border border-paper/10 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="font-semibold">{group.title}</h2>
                <p className="text-xs text-paper/50 mt-1">{group.description}</p>
              </div>
              {group.fields.map((f) =>
                f.type === "toggle" ? (
                  <label key={f.key} className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toggleToBool(values[f.key], true)}
                      onChange={(e) => setValues({ ...values, [f.key]: String(e.target.checked) })}
                      className="h-4 w-4 mt-0.5 accent-white"
                    />
                    <span>
                      <span className="text-paper/75 block">{f.label}</span>
                      {f.hint && <span className="text-xs text-paper/50 mt-0.5 block">{f.hint}</span>}
                    </span>
                  </label>
                ) : (
                  <label key={f.key} className="block text-sm">
                    <span className="text-paper/75 block mb-1.5">{f.label}</span>
                    <input
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full bg-void border border-paper/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/60"
                    />
                    {f.hint && <span className="text-xs text-paper/50 mt-1 block">{f.hint}</span>}
                  </label>
                )
              )}
            </div>
          ))}

          {Object.keys(values).filter((k) => !KNOWN_KEYS.includes(k) && !k.startsWith("PAYMOB_")).length > 0 && (
            <div className="bg-surface border border-paper/10 rounded-xl p-6 md:col-span-2">
              <h2 className="font-semibold mb-3 text-sm">Other stored settings</h2>
              <dl className="text-sm space-y-2">
                {Object.entries(values)
                  .filter(([k]) => !KNOWN_KEYS.includes(k) && !k.startsWith("PAYMOB_"))
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-paper/10 pb-2">
                      <dt className="text-paper/50">{k}</dt>
                      <dd className="text-paper/75 text-right break-all">{v}</dd>
                    </div>
                  ))}
              </dl>
              <p className="text-xs text-paper/40 mt-3">
                Paymob credentials are managed under{" "}
                <a href="/admin/integrations" className="underline hover:no-underline">Integrations</a>.
              </p>
            </div>
          )}

          <button onClick={save} disabled={saving}
            className="md:col-span-2 justify-self-start bg-orange text-void font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-orange/90 disabled:opacity-50">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}
    </AdminShell>
  );
}
