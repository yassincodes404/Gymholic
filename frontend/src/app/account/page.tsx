/*!
  GymHolic Account — a settings hub: one place for profile, security,
  bookings and billing, laid out with a sidebar like a SaaS settings page.
  Data: GET /api/users/me, PUT /api/users/me, GET /api/bookings/client/{id},
  GET /api/account/history, PUT /api/users/me/password.
*/

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildBackendApiUrl } from "@/lib/api";
import { fetchBookingPricing } from "@/lib/pricing";
import { fetchCurrentUser, getStoredAuthToken, logout, updateStoredUser, resolveAvatarUrl } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  IconUser,
  IconShield,
  IconGraduationCap,
  IconCalendar,
  IconCard,
  IconLibrary,
  IconLogout,
  IconPhone,
  IconMail,
  IconNote,
  IconSpark,
  IconCamera,
  IconPdf,
} from "@/components/account/icons";

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
  avatarUrl?: string;
}

type Tab = "profile" | "security" | "membership" | "bookings" | "billing" | "library";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <IconUser /> },
  { id: "security", label: "Security", icon: <IconShield /> },
  { id: "membership", label: "Membership", icon: <IconGraduationCap /> },
  { id: "bookings", label: "Bookings", icon: <IconCalendar /> },
  { id: "billing", label: "Billing", icon: <IconCard /> },
  { id: "library", label: "Library", icon: <IconLibrary /> },
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

  // Deep links (?tab=membership from the order-success page, …).
  const [next, setNext] = useState<BookingItem | null>(null);
  const [past, setPast] = useState<BookingItem[]>([]);
  const [bookingsTick, setBookingsTick] = useState(0);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const chipNavRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (requested && TABS.some((t) => t.id === requested)) setTab(requested);
  }, []);

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
  }, [router, bookingsTick]);


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

  // Scrolls the chip strip horizontally to center the active tab — never
  // the page itself (scrollIntoView would jump the document vertically).
  useEffect(() => {
    const nav = chipNavRef.current;
    const chip = chipRefs.current[tab];
    if (!nav || !chip) return;
    const target = chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [tab, loading]);

  /**
   * Client self-cancellation — the policy is the point: free cancellation
   * up to 12 hours before the session, payment refunded (the team settles
   * it with the gateway). Inside 12 hours the server refuses; the client
   * is told to contact us.
   */
  async function cancelBooking(booking: BookingItem) {
    const hoursLeft = (new Date(booking.startTime).getTime() - Date.now()) / 3_600_000;
    const paid = booking.status === "CONFIRMED";
    const policyLine = paid
      ? "Free cancellation up to 12 hours before the session — your payment is refunded after cancelling. Inside 12 hours, online cancellation is closed (contact us)."
      : "This booking isn't paid yet — cancelling simply releases the slot.";
    if (!window.confirm(
      `Cancel your session on ${formatWhen(booking.startTime)}?\n\n${policyLine}`)) {
      return;
    }
    if (paid && hoursLeft <= 12) {
      setError("Free cancellation closed — sessions can be cancelled up to 12 hours before they start. Contact us and we'll find a solution.");
      return;
    }
    setCancellingId(booking.id);
    setError(null);
    try {
      const res = await fetch(buildBackendApiUrl(`bookings/${booking.id}/cancel`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredAuthToken()}`,
        },
        body: JSON.stringify({ reason: "Cancelled by client from their account" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not cancel the booking.");
      }
      setBookingNotice(
        paid
          ? "Session cancelled — your refund is queued and will be settled to your original payment method."
          : "Session cancelled — the slot has been released."
      );
      setBookingsTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the booking.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-void text-paper pt-24 pb-20 px-4 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 booking-rise">
            <p className="text-[11px] uppercase tracking-[0.25em] mb-2" style={{ color: "var(--orange)" }}>
              Your account
            </p>
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
            <div className="grid gap-8 lg:grid-cols-[260px_1fr]">

              {/* Mobile: identity card sits above the tab strip */}
              <div
                className="lg:hidden min-w-0 flex items-center gap-4 rounded-2xl p-5 booking-rise"
                style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden shrink-0"
                  style={{ background: "rgba(255,106,0,0.14)", color: "var(--orange)", boxShadow: "0 0 0 1px rgba(255,106,0,0.35)" }}
                  aria-hidden
                >
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(user, { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: "", bio: "", email: user?.email ?? "" })
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-paper/50 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-orange/15 text-orange">
                    {user?.role === "ADMIN" ? "Admin" : "Client"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  aria-label="Sign out"
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-paper/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <IconLogout />
                </button>
              </div>

              {/* Mobile: horizontal tab chips */}
              <div className="lg:hidden min-w-0 -mx-4 px-4">
                <nav
                  ref={chipNavRef}
                  className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
                  aria-label="Account sections"
                >
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      ref={(el) => {
                        chipRefs.current[t.id] = el;
                      }}
                      onClick={() => setTab(t.id)}
                      className={`tab-chip ${tab === t.id ? "tab-chip-active" : ""}`}
                      aria-current={tab === t.id ? "page" : undefined}
                    >
                      <span aria-hidden>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Desktop sidebar */}
              <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
                <div className="bg-surface border border-paper/10 rounded-2xl p-4">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-11 h-11 rounded-full bg-orange/20 text-orange flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden">
                      {user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials(user, { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: "", bio: "", email: user?.email ?? "" })
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-paper/50 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="h-px bg-paper/10 my-2" />
                  <nav className="flex flex-col gap-1">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`account-row flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm whitespace-nowrap ${
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
                  <div className="h-px bg-paper/10 my-2" />
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="account-row flex items-center gap-2.5 text-left px-4 py-2.5 rounded-lg text-sm text-paper/60 hover:text-red-400 hover:bg-red-500/5 w-full"
                  >
                    <IconLogout />
                    Sign out
                  </button>
                </div>
              </aside>

              {/* Content — re-keyed per tab so each switch rises in */}
              <section className="min-w-0">
                <div key={tab} className="booking-rise">
                  {tab === "profile" && (
                    <ProfileTab user={user} />
                  )}
                  {tab === "security" && <SecurityTab email={user?.email} />}
                  {tab === "membership" && <MembershipTab email={user?.email} />}
                {tab === "bookings" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Next consultation</h2>
                      {bookingNotice && (
                        <div className="mb-4 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4 text-sm">
                          {bookingNotice}
                        </div>
                      )}
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
                          <div className="flex flex-wrap items-center gap-3 mt-5">
                            {next.meetLink && (
                              <a
                                href={next.meetLink}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors"
                              >
                                Join meeting
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={cancellingId === next.id}
                              onClick={() => cancelBooking(next)}
                              className="admin-btn admin-btn-danger !px-4 !py-2 !text-xs"
                            >
                              {cancellingId === next.id ? "Cancelling…" : "Cancel session"}
                            </button>
                          </div>
                          <p className="text-xs text-paper/40 mt-3">
                            Free cancellation up to 12 hours before the session — paid sessions are refunded.
                          </p>
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
                          {past.map((b, i) => (
                            <li
                              key={b.id}
                              className="booking-rise bg-surface border border-paper/10 rounded-xl p-5 flex items-center justify-between gap-4 transition-colors hover:border-paper/20"
                              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                            >
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
                        {history.map((row, i) => (
                          <li
                            key={row.key}
                            className="booking-rise bg-surface border border-paper/10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-paper/20"
                            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                          >
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
                </div>
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
    avatarUrl: user?.avatarUrl,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          avatarUrl: resolveAvatarUrl(typeof d.profileImageUrl === "string" ? d.profileImageUrl : undefined),
        });
      }
      setLoaded(true);
    })();
  }, [loaded, token]);

  /**
   * Resizes the chosen picture to a 256×256 cover-cropped JPEG in the
   * browser — small enough to upload instantly and to ride along in the
   * session payload — then PUTs it to the avatar endpoint.
   */
  async function onAvatarPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setFeedback({ kind: "err", text: "Profile pictures must be a JPG, PNG or WebP image." });
      return;
    }
    setAvatarBusy(true);
    setFeedback(null);
    try {
      const bitmap = await createImageBitmap(file);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size
      );
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("Could not process the image.");

      const body = new FormData();
      body.append("file", blob, "avatar.jpg");
      const res = await fetch(buildBackendApiUrl("users/me/avatar"), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not upload the picture.");
      }
      const url: string | undefined = resolveAvatarUrl(
        typeof payload.data?.profileImageUrl === "string" ? payload.data.profileImageUrl : undefined
      );
      setForm((f) => ({ ...f, avatarUrl: url }));
      updateStoredUser({ avatarUrl: url });
      setFeedback({ kind: "ok", text: "Profile picture updated." });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Could not upload the picture." });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(buildBackendApiUrl("users/me/avatar"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not remove the picture.");
      }
      setForm((f) => ({ ...f, avatarUrl: undefined }));
      updateStoredUser({ avatarUrl: undefined });
      setFeedback({ kind: "ok", text: "Profile picture removed." });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Could not remove the picture." });
    } finally {
      setAvatarBusy(false);
    }
  }

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
      <div className="bg-surface border border-paper/10 rounded-2xl p-6 md:p-10">
        <p className="text-[11px] uppercase tracking-[0.25em] mb-2" style={{ color: "var(--orange)" }}>
          Your details
        </p>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-8">Personal information</h2>

        <div className="flex items-center gap-4 mb-8 rounded-2xl p-4 md:p-5"
          style={{ background: "rgba(245,241,232,0.03)", border: "1px solid rgba(245,241,232,0.08)" }}>
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden"
              style={{ background: "rgba(255,106,0,0.14)", color: "var(--orange)", boxShadow: "0 0 0 1px rgba(255,106,0,0.35)" }}
            >
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="Your profile" className="w-full h-full object-cover" />
              ) : (
                initials(user, form)
              )}
            </div>
            {avatarBusy ? (
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)" }}
                aria-hidden
              >
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--orange)", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={form.avatarUrl ? "Change profile picture" : "Add a profile picture"}
                title={form.avatarUrl ? "Change picture" : "Add picture"}
                className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ background: "var(--orange)", color: "var(--void)", boxShadow: "0 0 0 3px #0c0c0c" }}
              >
                <IconCamera width={15} height={15} />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarPicked}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">
              {form.firstName} {form.lastName}
            </p>
            <p className="text-sm text-paper/50 truncate">{form.email}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="inline-block text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-orange/15 text-orange">
                {user?.role === "ADMIN" ? "Admin" : "Client"} account
              </span>
              {form.avatarUrl && !avatarBusy && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="text-[11px] text-paper/40 hover:text-red-400 transition-colors"
                >
                  Remove picture
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] mb-2.5 text-paper/60">First name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconUser /></span>
              <input className={`${inputClass} pl-11`} value={form.firstName} required
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] mb-2.5 text-paper/60">Last name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconUser /></span>
              <input className={`${inputClass} pl-11`} value={form.lastName} required
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] mb-2.5 text-paper/60">Phone</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconPhone /></span>
              <input className={`${inputClass} pl-11`} value={form.phone} autoComplete="tel" placeholder="+20 100 000 0000"
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <p className="text-xs text-paper/40 mt-1.5">Used for SMS &amp; WhatsApp session updates.</p>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] mb-2.5 text-paper/60">Email</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconMail /></span>
              <input className={`${inputClass} pl-11 opacity-60`} value={form.email} disabled readOnly />
            </div>
            <p className="text-xs text-paper/40 mt-1.5">
              Your email is your sign-in identity and can&apos;t be changed here.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] mb-2.5 text-paper/60">Bio</label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-paper/40 pointer-events-none"><IconNote /></span>
              <textarea className={`${inputClass} pl-11 min-h-24 resize-y`} value={form.bio}
                placeholder="A few words about you (optional)"
                onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
          </div>
        </div>
        {feedback && (
          <p className={`mt-6 text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
            {feedback.text}
          </p>
        )}
        <div className="mt-8 flex items-center gap-4">
          <button type="submit" disabled={busy} className="btn-pill !py-3 !px-8 disabled:opacity-50">
            {busy ? "Saving…" : "Save changes"}
          </button>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-paper/40">
            <IconSpark width={14} height={14} />
            Updates apply everywhere you use Gymholic
          </span>
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

interface OrderRow {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  items: { productId: string; productType: string; title: string }[];
}

/** The Academy membership lives in the order history: a PAID order with an
 *  ACADEMY item is the source of truth for "this account is a member". */
function MembershipTab({ email }: { email?: string }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [cancellable, setCancellable] = useState(true);
  const [salesPaused, setSalesPaused] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(buildBackendApiUrl("orders"), {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      const payload = res?.ok ? await res.json().catch(() => null) : null;
      if (!cancelled && payload?.success) setOrders(payload.data ?? []);
      else if (!cancelled && res && !res.ok) setOrders([]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchBookingPricing().then((pricing) => {
      if (!pricing) return;
      if (typeof pricing.academyMembershipPrice === "number" && pricing.academyMembershipPrice > 0) {
        setPrice(pricing.academyMembershipPrice);
      }
      if (typeof pricing.academyMembershipCancellable === "boolean") {
        setCancellable(pricing.academyMembershipCancellable);
      }
      if (typeof pricing.academyPrePurchaseEnabled === "boolean") {
        setSalesPaused(!pricing.academyPrePurchaseEnabled);
      }
    });
  }, []);

  async function cancelMembership() {
    if (!window.confirm(
      "Cancel your Academy membership?\n\nYour Early Access seat and whitelist entry are removed. Refunds are settled by our team — this doesn't move money instantly."
    )) {
      return;
    }
    const token = getStoredAuthToken();
    if (!token) return;
    setCancelBusy(true);
    setNotice(null);
    try {
      const res = await fetch(buildBackendApiUrl("membership/cancel"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not cancel the membership.");
      }
      setCancelled(true);
      setNotice("Membership cancelled — our team will be in touch about the refund.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not cancel the membership.");
    } finally {
      setCancelBusy(false);
    }
  }

  if (orders === null) {
    return (
      <div className="bg-surface border border-paper/10 rounded-2xl p-10 text-center text-paper/60">
        Loading your membership…
      </div>
    );
  }

  // Newest membership purchase wins (status PAID = money actually taken).
  const membershipOrder = orders
    .filter((o) => o.status === "PAID" && o.items.some((i) => i.productType === "ACADEMY"))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Academy membership</h2>

      {membershipOrder && !cancelled ? (
        <div className="bg-surface border border-orange/25 rounded-2xl p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 mb-3">
                ● Early Access · Active
              </span>
              <p className="text-xl font-semibold">Gymholic Academy Membership</p>
              <p className="text-sm text-paper/60 mt-1">
                {email ? `Held by ${email}` : "Held by this account"} · founding member
              </p>
            </div>
            <Link
              href="/academy"
              className="bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors"
            >
              Go to Academy
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Member since", value: membershipOrder.createdAt ? formatWhen(membershipOrder.createdAt) : "—" },
              { label: "Order reference", value: `#${membershipOrder.id}` },
              { label: "Paid", value: formatMoney(membershipOrder.total, "USD") },
            ].map((cell) => (
              <div key={cell.label} className="rounded-xl p-4" style={{ background: "rgba(245,241,232,0.03)", border: "1px solid rgba(245,241,232,0.08)" }}>
                <p className="text-xs uppercase tracking-wider text-paper/40 mb-1.5">{cell.label}</p>
                <p className="text-sm font-medium">{cell.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 space-y-4" style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}>
            {salesPaused && (
              <p className="text-xs font-medium px-3 py-2 rounded-lg inline-block" style={{ background: "rgba(255,106,0,0.08)", color: "var(--orange)" }}>
                Pre-launch: new membership sales are paused — your founding seat and price are locked in.
              </p>
            )}
            <p className="text-sm text-paper/70">
              Your seat is permanent: every lesson, PDF and framework lands in your account
              the day the Academy opens, and you&apos;re emailed at launch. Membership
              benefits grow with the library — no further payment.
            </p>
            {cancellable && (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => cancelMembership().catch(() => {})}
                  disabled={cancelBusy}
                  className="text-sm font-medium px-5 py-2 rounded-full text-red-400 border border-red-500/40 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {cancelBusy ? "Cancelling…" : "Cancel membership"}
                </button>
                <p className="text-xs text-paper/40 max-w-sm">
                  Cancelling removes your Early Access seat. Refunds are reviewed and
                  settled by our team — cancellation itself doesn&apos;t move money.
                </p>
              </div>
            )}
            {notice && (
              <p className="text-sm" style={{ color: "var(--orange)" }} role="status">
                {notice}
              </p>
            )}
          </div>
        </div>
      ) : cancelled ? (
        <div className="bg-surface border border-paper/10 rounded-2xl p-8 md:p-10 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-red-500/15 text-red-400 mb-4">
            Membership cancelled
          </span>
          <p className="text-sm text-paper/70 max-w-md mx-auto">
            Your Academy Early Access seat has been removed and the order marked refunded.
            Our team will contact you about the refund settlement.
          </p>
          {notice && (
            <p className="text-xs text-paper/50 mt-3">{notice}</p>
          )}
          <Link
            href="/academy"
            className="inline-block mt-6 bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors"
          >
            Get Early Access again
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-paper/10 rounded-2xl p-8 md:p-10 text-center">
          <p className="text-xs uppercase tracking-widest text-orange mb-3">Early Access</p>
          <p className="text-xl font-semibold mb-2">
            {price !== null ? `One payment of $${price} — the whole library.` : "One membership. The whole library."}
          </p>
          <p className="text-sm text-paper/60 max-w-md mx-auto mb-6">
            Pre-purchase now to lock founding-member pricing. Your membership lives in
            this account with every future lesson, PDF and framework included.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/academy"
              className="bg-orange text-void font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90 transition-colors"
            >
              Get Early Access
            </Link>
            <Link
              href="/blueprints"
              className="px-6 py-2.5 rounded-full border border-orange text-orange hover:bg-orange/10 transition-colors"
            >
              Browse Blueprints
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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
          {items.map((item, i) => (
            <div
              key={item.slug}
              className="booking-rise bg-surface border border-paper/10 rounded-xl p-4 flex gap-4 transition-colors hover:border-paper/20"
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <div className="w-16 h-20 shrink-0">
                {item.hasCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buildBackendApiUrl(`store/products/${item.slug}/cover`)}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(245,241,232,0.1)", color: "var(--orange)" }}
                    aria-hidden
                  >
                    <IconPdf width={26} height={26} />
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
