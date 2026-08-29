/*!
  GymHolic Account — a settings hub: one place for profile, security,
  bookings and billing, laid out with a sidebar like a SaaS settings page.
  Data: GET /api/users/me, PUT /api/users/me, GET /api/bookings/client/{id},
  GET /api/account/history, PUT /api/users/me/password.
*/

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildBackendApiUrl } from "@/lib/api";
import { fetchCurrentUser, getStoredAuthToken, logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface BookingItem {
  id: number;
  startTime: string;
  endTime: string;
  trainerName: string;
  meetingTimezone?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | "REJECTED";
  meetLink: string | null;
}

interface PaymentEntry {
  key: string;
  kind: "CONSULTATION_PAYMENT" | "FREE_CONSULTATION" | "ORDER";
  refId: number;
  title: string;
  amount: number;
  currency: string;
  status: string;
  providerName: string;
  occurredAt: string;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  email: string;
}

type Tab = "profile" | "security" | "bookings" | "billing" | "library";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "security", label: "Security", icon: "🔐" },
  { id: "bookings", label: "Bookings", icon: "📅" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "library", label: "Library", icon: "📚" },
];

const KIND_LABELS: Record<PaymentEntry["kind"], string> = {
  CONSULTATION_PAYMENT: "Consultation",
  FREE_CONSULTATION: "Free Consultation",
  ORDER: "Product order",
};

const BOOKING_STATUS_STYLES: Record<BookingItem["status"], string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  CONFIRMED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-blue-500/15 text-blue-400",
  CANCELLED: "bg-red-500/15 text-red-400",
  NO_SHOW: "bg-paper/10 text-paper/60",
  REJECTED: "bg-red-500/15 text-red-400",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  PENDING: "bg-amber-500/15 text-amber-400",
  FAILED: "bg-red-500/15 text-red-400",
  REFUNDED: "bg-blue-500/15 text-blue-400",
};

const inputClass =
  "field-input w-full rounded-lg border border-paper/15 bg-void px-4 py-3 text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(user: AuthUser | null, profile: ProfileForm) {
  const first = profile.firstName || user?.firstName || "";
  const last = profile.lastName || user?.lastName || "";
  const raw = (first.charAt(0) + last.charAt(0)).trim();
  return raw || (user?.email?.charAt(0).toUpperCase() ?? "G");
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [history, setHistory] = useState<PaymentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const current = await fetchCurrentUser(token);
      if (cancelled) return;
      if (!current) {
        logout();
        router.replace("/login");
        return;
      }
      setUser(current);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [bookingsRes, historyRes] = await Promise.all([
          fetch(
            buildBackendApiUrl(`bookings/client/${current.userId}?sort=startTime,desc`),
            { headers }
          ),
          fetch(buildBackendApiUrl("account/history"), { headers }).catch(() => null),
        ]);

        const bookingsPayload = await bookingsRes.json();
        if (!bookingsRes.ok || !bookingsPayload?.success) {
          throw new Error(bookingsPayload?.message || "Failed to load bookings.");
        }
        if (cancelled) return;
        setBookings(bookingsPayload.data?.content ?? []);

        const entries: PaymentEntry[] = [];
        if (historyRes?.ok) {
          const payload = await historyRes.json().catch(() => null);
          if (payload?.success && Array.isArray(payload.data)) entries.push(...payload.data);
        }
        if (cancelled) return;
        setHistory(
          [...entries].sort(
            (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your account data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const [next, setNext] = useState<BookingItem | null>(null);
  const [past, setPast] = useState<BookingItem[]>([]);

  useEffect(() => {
    if (bookings.length === 0) {
      setNext(null);
      setPast([]);
      return;
    }
    const now = Date.now();
    const upcoming = bookings
      .filter(
        (b) =>
          (b.status === "CONFIRMED" || b.status === "PENDING") &&
          new Date(b.endTime).getTime() > now
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const nextBooking = upcoming[0] ?? null;
    setNext(nextBooking);
    setPast(nextBooking ? bookings.filter((b) => b.id !== nextBooking.id) : bookings);
  }, [bookings]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-void text-paper pt-24 pb-20 px-4 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Account settings</h1>
            <p className="text-paper/60 mt-2">
              Everything about your Gymholic account in one place.
            </p>
          </div>

          {loading ? (
            <div className="bg-surface border border-paper/10 rounded-2xl p-10 text-center text-paper/60">
              Loading your account…
            </div>
          ) : error ? (
            <div className="bg-surface border border-red-500/30 rounded-2xl p-10 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
              {/* Sidebar */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-surface border border-paper/10 rounded-2xl p-4 mb-4 flex lg:flex-col items-center gap-4 lg:gap-2 lg:items-stretch overflow-x-auto lg:overflow-visible">
                  <div className="hidden lg:flex items-center gap-3 p-3">
                    <div className="w-11 h-11 rounded-full bg-orange/20 text-orange flex items-center justify-center text-lg font-bold shrink-0">
                      {initials(user, { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: "", bio: "", email: user?.email ?? "" })}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-paper/50 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="hidden lg:block h-px bg-paper/10 my-2" />
                  <nav className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                          tab === t.id
                            ? "bg-orange/15 text-orange font-medium"
                            : "text-paper/70 hover:text-paper hover:bg-paper/5"
                        }`}
                      >
                        <span aria-hidden>{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </nav>
                  <div className="hidden lg:block h-px bg-paper/10 my-2" />
                  <div className="hidden lg:flex flex-col gap-1">
                    <button
                      onClick={() => {
                        logout();
                        router.push("/");
                      }}
                      className="text-left px-4 py-2.5 rounded-lg text-sm text-paper/60 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </aside>

              {/* Content */}
              <section>
                {tab === "profile" && (
                  <ProfileTab user={user} />
                )}
                {tab === "security" && <SecurityTab email={user?.email} />}
                {tab === "bookings" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Next consultation</h2>
                      {next ? (
                        <div className="bg-surface border border-orange/25 rounded-2xl p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-xl font-semibold">{formatWhen(next.startTime)}</p>
                              <p className="text-paper/60 text-sm mt-1">
                                with {next.trainerName} · 45 minutes
                              </p>
                            </div>
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${BOOKING_STATUS_STYLES[next.status]}`}>
                              {next.status}
                            </span>
                          </div>
                          {next.meetLink && (
                            <a
                              href={next.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-5 bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors"
                            >
                              Join meeting
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="bg-surface border border-paper/10 rounded-2xl p-10 text-center">
                          <p className="text-paper/60">No upcoming consultations.</p>
                          <Link href="/book" className="inline-block mt-4 bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors">
                            Book a session
                          </Link>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Booking history</h2>
                      {past.length === 0 ? (
                        <div className="bg-surface border border-paper/10 rounded-2xl p-8 text-center text-paper/60">
                          {bookings.length === 0 ? "You have no bookings yet." : "No past bookings."}
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {past.map((b) => (
                            <li key={b.id} className="bg-surface border border-paper/10 rounded-xl p-5 flex items-center justify-between gap-4">
                              <div>
                                <p className="font-medium">{formatWhen(b.startTime)}</p>
                                <p className="text-xs text-paper/50">with {b.trainerName}</p>
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BOOKING_STATUS_STYLES[b.status]}`}>
                                {b.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                {tab === "billing" && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Payment history</h2>
                    {history.length === 0 ? (
                      <div className="bg-surface border border-paper/10 rounded-2xl p-10 text-center">
                        <p className="text-paper/60">No payments yet.</p>
                        <p className="text-xs text-paper/40 mt-2">
                          Consultations and products you purchase will be listed here with their receipts.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {history.map((row) => (
                          <li key={row.key} className="bg-surface border border-paper/10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{row.title}</p>
                              <p className="text-xs text-paper/50 mt-0.5">
                                {formatWhen(row.occurredAt)} · {KIND_LABELS[row.kind] ?? row.kind} · via {row.providerName || "—"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">
                                {row.amount > 0 ? formatMoney(row.amount, row.currency) : "Free"}
                              </span>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAYMENT_STATUS_STYLES[row.status] ?? "bg-paper/10 text-paper/75"}`}>
                                {row.status}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {tab === "library" && <LibraryTab />}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ProfileTab({ user }: { user: AuthUser | null }) {
  const token = getStoredAuthToken();
  const [form, setForm] = useState<ProfileForm>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: "",
    bio: "",
    email: user?.email ?? "",
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (loaded || !token) return;
    (async () => {
      const res = await fetch(buildBackendApiUrl("users/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success && payload.data) {
        const d = payload.data;
        setForm({
          firstName: d.firstName ?? "",
          lastName: d.lastName ?? "",
          phone: d.phone ?? "",
          bio: d.bio ?? "",
          email: d.email ?? "",
        });
      }
      setLoaded(true);
    })();
  }, [loaded, token]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(buildBackendApiUrl("users/me"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          bio: form.bio || null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not save your profile.");
      }
      setFeedback({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="bg-surface border border-paper/10 rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-6">Personal information</h2>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-orange/20 text-orange flex items-center justify-center text-2xl font-bold shrink-0">
            {initials(user, form)}
          </div>
          <div>
            <p className="font-medium">
              {form.firstName} {form.lastName}
            </p>
            <p className="text-sm text-paper/50">{form.email}</p>
            <p className="text-xs text-paper/40 mt-0.5">
              Signed in via {user?.role === "ADMIN" ? "admin account" : "customer account"}
            </p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2 text-paper/75">First name</label>
            <input className={inputClass} value={form.firstName} required
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-paper/75">Last name</label>
            <input className={inputClass} value={form.lastName} required
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-paper/75">Phone</label>
            <input className={inputClass} value={form.phone} autoComplete="tel" placeholder="+20 100 000 0000"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-paper/75">Email</label>
            <input className={`${inputClass} opacity-60`} value={form.email} disabled readOnly />
            <p className="text-xs text-paper/40 mt-1.5">
              Your email is your sign-in identity and can&apos;t be changed here.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-paper/75">Bio</label>
            <textarea className={`${inputClass} min-h-24 resize-y`} value={form.bio}
              placeholder="A few words about you (optional)"
              onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
        </div>
        {feedback && (
          <p className={`mt-5 text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
            {feedback.text}
          </p>
        )}
        <div className="mt-6">
          <button type="submit" disabled={busy}
            className="bg-orange text-void font-semibold px-8 py-2.5 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

interface LibraryItem {
  slug: string;
  title: string;
  shortDescription: string | null;
  isFree: boolean;
  owned: boolean;
  hasCover: boolean;
  category: { name: string; slug: string } | null;
}

function LibraryTab() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildBackendApiUrl("store/library"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.success) throw new Error("Could not load your library.");
        if (!cancelled) setItems(payload.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your library.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="bg-surface border border-red-500/30 rounded-2xl p-10 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="bg-surface border border-paper/10 rounded-2xl p-10 text-center text-paper/60">
        Loading your library…
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Library</h2>
      {items.length === 0 ? (
        <div className="bg-surface border border-paper/10 rounded-2xl p-10 text-center">
          <p className="text-paper/60">Your library is empty.</p>
          <p className="text-xs text-paper/40 mt-2 mb-5">
            Free blueprints appear here instantly; purchased ones land here after checkout.
          </p>
          <Link href="/blueprints" className="inline-block bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors">
            Browse Blueprints
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => (
            <div key={item.slug} className="bg-surface border border-paper/10 rounded-xl p-4 flex gap-4">
              <div className="w-16 h-20 shrink-0">
                {item.hasCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buildBackendApiUrl(`store/products/${item.slug}/cover`)}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-paper/5 border border-paper/10 flex items-center justify-center text-xl" aria-hidden>
                    📄
                  </div>
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <p className="text-xs uppercase tracking-wider text-orange mb-1">
                  {item.category?.name ?? "Blueprint"}
                </p>
                <p className="font-medium truncate">{item.title}</p>
                <p className="text-xs text-paper/40 mt-0.5">
                  {item.isFree ? "Free" : item.owned ? "Purchased" : ""}
                </p>
                <Link
                  href={`/blueprints/${item.slug}`}
                  className="mt-auto self-start text-sm text-orange hover:underline pt-2"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityTab({ email }: { email?: string }) {  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(buildBackendApiUrl("users/me/password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not change the password.");
      }
      setCurrent("");
      setNew("");
      setFeedback({ kind: "ok", text: "Password changed — check your inbox for the confirmation email." });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Could not change." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-surface border border-paper/10 rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-2">Change password</h2>
        <p className="text-sm text-paper/60 mb-6">
          {email ? `For ${email}. ` : ""}We&apos;ll email a confirmation when it changes.
        </p>
        <form onSubmit={submit} className="space-y-5 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-2 text-paper/75">Current password</label>
            <input type="password" required autoComplete="current-password" className={inputClass}
              value={currentPassword} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-paper/75">New password</label>
            <input type="password" required minLength={8} autoComplete="new-password" className={inputClass}
              value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {feedback && (
            <p className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {feedback.text}
            </p>
          )}
          <button type="submit" disabled={busy}
            className="bg-orange text-void font-semibold px-8 py-2.5 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-50">
            {busy ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>

      <div className="bg-surface border border-paper/10 rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-2">Sign-in security</h2>
        <ul className="text-sm text-paper/70 space-y-2.5">
          <li className="flex gap-3"><span className="text-orange">✓</span> Email codes verify every new account before the first session.</li>
          <li className="flex gap-3"><span className="text-orange">✓</span> You&apos;re emailed whenever a new device signs in to your account.</li>
          <li className="flex gap-3"><span className="text-orange">✓</span> Password changes always require your current password.</li>
        </ul>
        <p className="text-sm text-paper/50 mt-5">
          Forgot your password instead?{" "}
          <Link href="/forgot-password" className="text-orange underline hover:no-underline">
            Reset it by email
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
