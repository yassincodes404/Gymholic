"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart, useCartItems } from "@/components/cart/CartContext";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";
import { fetchCurrentUser, getStoredAuthToken, logout, type AuthUser } from "@/lib/auth";
import { IconCheck, IconLock, IconUser, IconPdf, IconArrowRight } from "@/components/account/icons";

/*!
 * Checkout — the review step before the dedicated /pay page. Members only:
 * the buyer confirms what's in the order and who's paying, then proceeds to
 * Gymholic Pay (the same secure light payment page every purchase uses).
 * Guests are asked to sign in first (?next= return links); the cart
 * survives the round-trip.
 *
 * Layout mirrors the /pay page's two-panel rhythm: identity + what-happens-
 * next on the left, the sticky order summary on the right, one orange CTA.
 */
const STEPS = ["Cart", "Checkout", "Pay", "Unlocked"];

function StepTrack({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3 flex-wrap">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2 sm:gap-3">
          <span
            className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${
              i === current ? "text-[var(--orange)]" : i < current ? "opacity-60" : "opacity-30"
            }`}
            style={{
              background: i === current ? "rgba(255,106,0,0.10)" : "rgba(245,241,232,0.04)",
              border: `1px solid ${i === current ? "rgba(255,106,0,0.35)" : "transparent"}`,
            }}
          >
            {i < current ? <IconCheck width={11} height={11} /> : <span>{i + 1}</span>}
            {step}
          </span>
          {i < STEPS.length - 1 && <span className="opacity-25 text-xs" aria-hidden>—</span>}
        </li>
      ))}
    </ol>
  );
}

export default function CheckoutPage() {
  useLenis();
  const router = useRouter();
  const { itemIds, subtotal, hydrated } = useCart();
  const items = useCartItems();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const completedRef = useRef(false);

  // Only an empty cart AFTER the cart context actually hydrated (server cart
  // or localStorage, whichever applies) means "nothing to check out" — the
  // old fixed 50ms timer raced the network and bounced members home.
  useEffect(() => {
    if (hydrated && itemIds.length === 0 && !completedRef.current) router.replace("/");
  }, [hydrated, itemIds.length, router]);

  // Resolve the session after mount — localStorage is unreadable during SSR.
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setAuthResolved(true);
      return;
    }
    let cancelled = false;
    fetchCurrentUser(token).then((account) => {
      if (!cancelled) {
        setUser(account);
        setAuthResolved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated || itemIds.length === 0) return null;

  // Guests: no anonymous checkout — ask them to sign in (or create an
  // account) and come straight back. The cart survives the round-trip.
  if (authResolved && !user) {
    return (
      <>
        <ScrollRefresher />
        <Header />
        <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
          <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--orange)" }}>
            Secure checkout
          </p>
          <h1 className="display-hero text-3xl md:text-5xl mb-12">Checkout</h1>
          <div
            className="max-w-md rounded-2xl p-8 booking-rise"
            style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
          >
            <p className="text-sm opacity-70 mb-6">
              You need a Gymholic account to check out — your Blueprints are tied to it, so you
              can open them any time from your library.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login?next=/checkout" className="btn-pill">
                Sign in to pay
              </Link>
              <Link href="/register" className="btn-pill btn-pill--ghost">
                Create account
              </Link>
            </div>
          </div>
          <div className="max-w-md mt-10">
            <OrderSummary items={items} total={subtotal} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--orange)" }}>
          Secure checkout
        </p>
        <h1 className="display-hero text-3xl md:text-5xl mb-6">Review &amp; continue</h1>
        <div className="mb-12">
          <StepTrack current={1} />
        </div>

        <div className="grid md:grid-cols-2 gap-8 xl:gap-12 max-w-5xl xl:max-w-6xl items-start">
          <div className="space-y-6">
            {user ? (
              <div
                className="rounded-2xl p-6 booking-rise"
                style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
              >
                <p className="text-[11px] uppercase tracking-[0.25em] mb-4" style={{ color: "var(--orange)" }}>
                  Paying as
                </p>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0"
                    style={{ background: "rgba(255,106,0,0.14)", color: "var(--orange)", boxShadow: "0 0 0 1px rgba(255,106,0,0.35)" }}
                    aria-hidden
                  >
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user.firstName || user.email).slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate flex items-center gap-2">
                      {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Member"}
                      <IconUser width={13} height={13} className="opacity-40" />
                    </p>
                    <p className="text-sm opacity-60 truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUser(null);
                    }}
                    className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity shrink-0"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-40">Checking your session…</p>
            )}

            <div
              className="rounded-2xl p-6 md:p-8 booking-rise"
              style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)", animationDelay: "60ms" }}
            >
              <div className="flex justify-between items-baseline mb-6">
                <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--orange)" }}>
                  Total due
                </p>
                <p className="display-text text-3xl">${subtotal}</p>
              </div>

              <ul className="space-y-2.5 text-sm opacity-80 mb-7">
                {[
                  "Blueprints unlock in your library the second payment lands",
                  "Receipt + purchase summary by email",
                  "Pay on a dedicated secure page — we never see card details",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0" style={{ color: "var(--orange)" }}>
                      <IconCheck width={15} height={15} />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={busy}
                onClick={() => router.push("/pay")}
                className="btn-pill w-full justify-center disabled:opacity-50"
              >
                Proceed to Secure Payment
                <IconArrowRight width={16} height={16} />
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs opacity-40">
                <IconLock width={13} height={13} />
                Cards are handled by our payment gateway
              </div>
            </div>

            <Link
              href="/blueprints"
              className="inline-flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              <span className="service-card-arrow" aria-hidden>
                ←
              </span>
              Keep browsing Blueprints
            </Link>
          </div>

          <div className="md:sticky md:top-28">
            <OrderSummary items={items} total={subtotal} />
            <div className="flex items-center gap-2 mt-4 justify-center text-[11px] opacity-40">
              <IconPdf width={13} height={13} />
              Digital delivery — nothing ships
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
