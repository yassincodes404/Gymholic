/*!
  GymHolic Admin Integrations — Google Calendar connection plus payment
  gateways (Paymob now, Stripe coming soon).
  Google: GET /api/integrations/google/connect -> OAuth -> backend callback
  redirects back here with ?google=connected|error. Status: GET .../status.
  Paymob: GET/PUT /api/payments/admin/providers(/paymob) + POST .../paymob/test.
*/

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { buildBackendApiUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";

interface GoogleStatus {
  connected: boolean;
  googleEmail: string | null;
}

interface PaymobStatus {
  enabled: boolean;
  configured: boolean;
  active: boolean;
  apiKeyMasked: string;
  integrationId: string;
  iframeId: string;
  hmacSecretMasked: string;
}

interface ProvidersStatus {
  activeProvider: "paymob" | "mock" | "none";
  mockAvailable: boolean;
  paymob: PaymobStatus;
}

const inputStyle =
  "w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600";

function activeProviderLabel(status: ProvidersStatus | null) {
  switch (status?.activeProvider) {
    case "paymob":
      return "Paymob (live card payments)";
    case "mock":
      return "Mock — test mode";
    default:
      return "None configured";
  }
}

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<p className="text-neutral-400">Loading integrations…</p>}>
      <AdminIntegrations />
    </Suspense>
  );
}

function AdminIntegrations() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthResult = searchParams.get("google");
  const oauthError = searchParams.get("message");

  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    oauthResult === "connected" ? "Google Calendar connected successfully." : null
  );

  // Payment providers
  const [providers, setProviders] = useState<ProvidersStatus | null>(null);
  const [paymobApiKey, setPaymobApiKey] = useState("");
  const [paymobIntegrationId, setPaymobIntegrationId] = useState("");
  const [paymobIframeId, setPaymobIframeId] = useState("");
  const [paymobHmac, setPaymobHmac] = useState("");
  const [paymobEnabled, setPaymobEnabled] = useState(false);
  const [savingPaymob, setSavingPaymob] = useState(false);
  const [testingPaymob, setTestingPaymob] = useState(false);
  const [paymobTestResult, setPaymobTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (oauthResult === "connected") {
      router.replace("/admin/integrations");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    try {
      const res = await fetch(buildBackendApiUrl("integrations/google/status"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (res.ok && payload?.success) setStatus(payload.data);
      else setError(payload?.message || "Failed to load Google status.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Google status.");
    }
  }, []);

  const loadProviders = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    try {
      const res = await fetch(buildBackendApiUrl("payments/admin/providers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (res.ok && payload?.success) {
        const data = payload.data as ProvidersStatus;
        setProviders(data);
        setPaymobEnabled(data.paymob?.enabled ?? false);
      }
    } catch {
      // Payment status is non-fatal for the page.
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadProviders();
  }, [loadStatus, loadProviders]);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const token = getStoredAuthToken();
      const res = await fetch(buildBackendApiUrl("integrations/google/connect"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success || !payload?.data?.url) {
        throw new Error(payload?.message || "Could not start Google authorization.");
      }
      window.location.href = payload.data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Google authorization.");
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      const token = getStoredAuthToken();
      const res = await fetch(buildBackendApiUrl("integrations/google"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Disconnect failed.");
      setStatus({ connected: false, googleEmail: null });
      setNotice("Google Calendar disconnected.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePaymob() {
    setSavingPaymob(true);
    setError(null);
    setNotice(null);
    setPaymobTestResult(null);
    try {
      const token = getStoredAuthToken();
      const res = await fetch(buildBackendApiUrl("payments/admin/providers/paymob"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          apiKey: paymobApiKey || null,
          integrationId: paymobIntegrationId || null,
          iframeId: paymobIframeId || null,
          hmacSecret: paymobHmac || null,
          enabled: paymobEnabled,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not save Paymob settings.");
      }
      setProviders(payload.data as ProvidersStatus);
      setPaymobEnabled((payload.data as ProvidersStatus).paymob.enabled);
      setPaymobApiKey("");
      setPaymobHmac("");
      setNotice("Paymob settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save Paymob settings.");
    } finally {
      setSavingPaymob(false);
    }
  }

  async function testPaymob() {
    setTestingPaymob(true);
    setPaymobTestResult(null);
    try {
      const token = getStoredAuthToken();
      const res = await fetch(buildBackendApiUrl("payments/admin/providers/paymob/test"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      setPaymobTestResult(payload?.data?.ok ? "✓ Connection successful — Paymob accepted the API key." : `✗ ${payload?.message || "Connection failed."}`);
    } catch (e) {
      setPaymobTestResult(`✗ ${e instanceof Error ? e.message : "Connection failed."}`);
    } finally {
      setTestingPaymob(false);
    }
  }

  return (
    <AdminShell activeHref="/admin/integrations">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Integrations</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Connect the tools GymHolic runs on — calendar &amp; meetings, and the
        payment gateway customers pay through. Checkout is currently using:{" "}
        <span className="text-neutral-200 font-medium">{activeProviderLabel(providers)}</span>.
      </p>

      {notice && (
        <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">
          {notice}
        </div>
      )}
      {(error || (oauthResult === "error" && oauthError)) && (
        <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">
          {error || `Google connection failed: ${oauthError}`}
        </div>
      )}

      {/* ---------- Payment providers ---------- */}
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-4">Payment providers</h2>

        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {/* Paymob */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center justify-center h-10 w-16 rounded-md bg-sky-600 text-white text-xs font-bold">
                Paymob
              </span>
              <div>
                <h3 className="font-semibold">Paymob</h3>
                <p className="text-xs text-neutral-500">Online card payments — accept.paymob.com</p>
              </div>
              <span
                className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                  providers?.paymob.active
                    ? "bg-emerald-500/15 text-emerald-400"
                    : providers?.paymob.configured
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {providers?.paymob.active ? "● Enabled" : providers?.paymob.configured ? "Configured — disabled" : "○ Not configured"}
              </span>
            </div>

            <p className="text-sm text-neutral-400 mb-5">
              Enter your Paymob credentials and enable the gateway — customers
              then pay by card at checkout and the booking confirms
              automatically after payment. Leave a field empty to keep its
              saved value.
            </p>

            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-neutral-300 block mb-1.5">API key</span>
                <input
                  type="password"
                  value={paymobApiKey}
                  onChange={(e) => setPaymobApiKey(e.target.value)}
                  placeholder={providers?.paymob.apiKeyMasked || "From Paymob Dashboard → Developers → API key"}
                  className={inputStyle}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-neutral-300 block mb-1.5">Integration ID</span>
                  <input
                    value={paymobIntegrationId}
                    onChange={(e) => setPaymobIntegrationId(e.target.value)}
                    placeholder={providers?.paymob.integrationId || "e.g. 123456"}
                    className={inputStyle}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-neutral-300 block mb-1.5">Iframe ID</span>
                  <input
                    value={paymobIframeId}
                    onChange={(e) => setPaymobIframeId(e.target.value)}
                    placeholder={providers?.paymob.iframeId || "e.g. 789012"}
                    className={inputStyle}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-neutral-300 block mb-1.5">HMAC secret</span>
                <input
                  type="password"
                  value={paymobHmac}
                  onChange={(e) => setPaymobHmac(e.target.value)}
                  placeholder={providers?.paymob.hmacSecretMasked || "From Paymob Dashboard → Developers → HMAC"}
                  className={inputStyle}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={paymobEnabled}
                  onChange={(e) => setPaymobEnabled(e.target.checked)}
                  className="h-4 w-4 accent-white"
                />
                Enabled — use Paymob for checkout
              </label>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={savePaymob}
                disabled={savingPaymob}
                className="bg-white text-neutral-950 font-semibold rounded-lg px-4 py-2 text-sm hover:bg-neutral-200 disabled:opacity-50"
              >
                {savingPaymob ? "Saving…" : "Save Paymob Settings"}
              </button>
              <button
                onClick={testPaymob}
                disabled={testingPaymob || !providers?.paymob.configured}
                className="border border-neutral-700 rounded-lg px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
              >
                {testingPaymob ? "Testing…" : "Test Connection"}
              </button>
            </div>
            {paymobTestResult && <p className="text-sm mt-3 text-neutral-300">{paymobTestResult}</p>}
          </div>

          {/* Stripe — coming soon */}
          <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center justify-center h-10 w-16 rounded-md bg-indigo-500 text-white text-xs font-bold">
                stripe
              </span>
              <div>
                <h3 className="font-semibold">Stripe</h3>
                <p className="text-xs text-neutral-500">Global card payments, wallets &amp; subscriptions</p>
              </div>
              <span className="ml-auto text-[10px] uppercase tracking-wider bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-neutral-400">
              Stripe will appear here with the same connect flow — API keys,
              enable toggle and connection test — when its integration ships.
              Until then, checkout uses the gateway enabled above.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Calendar & meetings ---------- */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-4">Calendar &amp; meetings</h2>
        <div className="max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="font-semibold text-lg">Google Calendar &amp; Meet</h3>
              <p className="text-xs text-neutral-500">
                OAuth connection — GymHolic never sees your Google password.
              </p>
            </div>
            <span
              className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
                status?.connected
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {status === null ? "…" : status.connected ? "● Connected" : "○ Not connected"}
            </span>
          </div>

          {status?.connected ? (
            <>
              <dl className="space-y-2 text-sm mb-6">
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <dt className="text-neutral-500">Account</dt>
                  <dd>{status.googleEmail}</dd>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <dt className="text-neutral-500">Calendar</dt>
                  <dd>Primary</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Used for</dt>
                  <dd>Events · Meet links · Attendee invites</dd>
                </div>
              </dl>
              <div className="flex gap-3">
                <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
                  className="border border-neutral-700 rounded-lg px-4 py-2 text-sm hover:bg-neutral-800 transition-colors">
                  Open Google Calendar
                </a>
                <button onClick={handleConnect} disabled={busy}
                  className="border border-neutral-700 rounded-lg px-4 py-2 text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  Reconnect
                </button>
                <button onClick={handleDisconnect} disabled={busy}
                  className="bg-red-900/60 border border-red-800 text-red-200 rounded-lg px-4 py-2 text-sm hover:bg-red-900 disabled:opacity-50">
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-400 mb-4">Connect your Google account to automatically:</p>
              <ul className="text-sm space-y-2 mb-6 text-neutral-300">
                <li>✓ Create consultation events on payment confirmation</li>
                <li>✓ Generate Google Meet links for each consultation</li>
                <li>✓ Invite the customer as an attendee</li>
                <li>✓ Update/delete events on reschedule or cancellation</li>
              </ul>
              <button onClick={handleConnect} disabled={busy}
                className="bg-white text-neutral-950 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50">
                {busy ? "Starting…" : "Connect Google"}
              </button>
            </>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
