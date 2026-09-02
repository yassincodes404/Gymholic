"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useCart, useCartItems } from "@/components/cart/CartContext";
import { TermsAcceptance } from "@/components/checkout/TermsAcceptance";
import { CardBrandRow, detectCardBrand } from "@/components/payment/PaymentCard";
import { buildBackendApiUrl } from "@/lib/api";
import { storeCoverUrl } from "@/lib/store";
import { fetchCurrentUser, getStoredAuthToken, type AuthUser } from "@/lib/auth";
import { IconCalendar, IconCheck, IconLock } from "@/components/account/icons";

type Provider = "paymob" | "mock" | "none";
type Stage = "review" | "checkout" | "confirming" | "success" | "failed";

/*!
 * Gymholic Pay — the one dedicated payment page every purchase goes through
 * (consultation bookings, Blueprints, Academy membership). Strongly branded,
 * calm surface: dark athletic order card on the left, clean payment card on
 * the right, one controlled orange accent. Paymob active → the real secure
 * form is embedded in a clean container after "Pay" (we don't fight the
 * iframe — everything around it is unmistakably Gymholic); test mode → the
 * simulated card fields, badged. Bookings/orders are confirmed by the
 * HMAC-verified webhook. Currency is explicit: when the gateway collects a
 * different currency than the order (USD → EGP), the payable amount is
 * converted server-side and shown here — never silently relabeled.
 */

const ACCENT = "#FF6A2A";
const theme = {
  bg: "#F7F6F2",
  ink: "#141414",
  cardDark: "#111111",
  cardDarkLine: "#242424",
  cardLight: "#FFFFFF",
  line: "#e5e5e5",
  muted: "#6f6a5e",
  mutedDark: "rgba(255,255,255,0.55)",
};

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function money(amount: number, currency: string) {
  return `${currency === "USD" ? "$" : `${currency} `}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PayPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { clear } = useCart();
  const cartItems = useCartItems();

  const bookingId = Number(params.get("booking")) || null;
  const bookingAmount = Number(params.get("amount")) || 0;
  const bookingCurrency = params.get("currency") || "USD";
  const bookingLabel = params.get("label") || "Consultation booking";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [stage, setStage] = useState<Stage>("review");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  // What the gateway actually collects (converted USD→EGP when needed).
  const [payable, setPayable] = useState<{ amount: number; currency: string } | null>(null);
  // Egypt config from the public pricing endpoint — lets the page show the
  // real payable amount BEFORE the payment starts (order price in USD,
  // payment in EGP), matching what Paymob will charge.
  const [payCfg, setPayCfg] = useState<{ currency: string; rate: number; source: string } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ref: string; meetLink: string | null } | null>(null);
  // The embedded Paymob form gets a skeleton until its onload fires — the
  // frame is dynamic: responsive height + fade-in when it's really there.
  const [frameLoaded, setFrameLoaded] = useState(false);

  // Test-mode card form
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");

  const orderRef = useRef<number | null>(null);
  const bookingRef = useRef<number | null>(null);
  const payingRef = useRef(false);

  const isBooking = bookingId !== null;
  const items = isBooking
    ? [{ id: "booking", name: bookingLabel, price: bookingAmount, kind: "Session" }]
    : cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, kind: i.kindLabel }));
  const total = isBooking ? bookingAmount : cartItems.reduce((sum, i) => sum + i.price, 0);
  const currency = isBooking ? bookingCurrency : "USD";
  const brand = detectCardBrand(cardNumber);
  // The payable shown everywhere: the exact amount Paymob will collect. The
  // intention response wins; until then it's derived from the public config.
  const effectivePayable = payable
    ?? (payCfg && payCfg.currency !== currency
      ? { amount: Math.round(total * payCfg.rate * 100) / 100, currency: payCfg.currency }
      : null);
  const showConversion = effectivePayable !== null;

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

  useEffect(() => {
    let cancelled = false;
    fetch(buildBackendApiUrl("payments/active-provider"))
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        if (!cancelled) setProvider(payload?.data?.provider ?? "none");
      })
      .catch(() => {
        if (!cancelled) setProvider("none");
      });
    fetch(buildBackendApiUrl("settings/pricing"))
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        if (!cancelled && payload?.success && payload.data) {
          const cfgCurrency = String(payload.data.paymobCurrency || "").toUpperCase();
          const rate = Number(payload.data.egpUsdRate);
          if (cfgCurrency && rate > 0) {
            setPayCfg({
              currency: cfgCurrency,
              rate,
              source: String(payload.data.egpRateSource || ""),
            });
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- confirmation polling (webhook is the source of truth) ----

  const waitForOrder = useCallback(async (orderId: number) => {
    const token = getStoredAuthToken();
    setStage("confirming");
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(buildBackendApiUrl(`orders/${orderId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json().catch(() => null);
        if (res.ok && payload?.data?.status === "PAID") {
          clear();
          router.push(`/order-success?order=${orderId}`);
          return;
        }
      } catch {
        // transient — keep polling
      }
    }
    clear();
    router.push(`/order-success?order=${orderId}`);
  }, [clear, router]);

  const waitForBooking = useCallback(async (id: number) => {
    const token = getStoredAuthToken();
    setStage("confirming");
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(buildBackendApiUrl(`bookings/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json().catch(() => null);
        if (res.ok && payload?.data) {
          const status = payload.data.status as string;
          if (status === "CONFIRMED" || status === "COMPLETED") {
            setResult({ ref: `BK-${id}`, meetLink: payload.data.meetLink ?? null });
            setStage("success");
            return;
          }
        }
      } catch {
        // transient — keep polling
      }
    }
    setResult({ ref: `BK-${id}`, meetLink: null });
    setStage("success");
  }, []);

  // Embedded Paymob checkout finisher (/payment-status posts from the frame).
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; url?: string } | null;
      if (!data || data.type !== "paymob-embedded-done" || !data.url) return;
      const outcome = new URL(data.url, window.location.origin).searchParams;
      const paid = outcome.get("success") === "true" || outcome.get("pending") === "true";
      setCheckoutUrl(null);
      const bId = bookingRef.current;
      const oId = orderRef.current;
      bookingRef.current = null;
      orderRef.current = null;
      if (!paid) {
        setPayError("The payment didn't go through — no money was taken. You can try again.");
        setStage("failed");
        return;
      }
      if (bId) void waitForBooking(bId);
      else if (oId) void waitForOrder(oId);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [waitForBooking, waitForOrder]);

  // ---- pay actions ----

  async function postJson(path: string, body: unknown, token: string | null) {
    const res = await fetch(buildBackendApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      throw new Error(payload?.message || `Request failed (${res.status}).`);
    }
    return payload.data;
  }

  /** Real gateway: start the intention, then embed Paymob's secure form. */
  async function payWithPaymob() {
    if (!termsAccepted) {
      setTermsError("Please accept the Terms & Conditions to continue.");
      return;
    }
    setTermsError(null);
    if (payingRef.current) return;
    payingRef.current = true;
    setBusy(true);
    setPayError(null);
    try {
      const token = getStoredAuthToken();
      if (!token) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (isBooking) {
        const payment = await postJson("payments", { bookingId, provider: "paymob" }, token);
        bookingRef.current = bookingId;
        if (payment.payableAmount) {
          setPayable({ amount: Number(payment.payableAmount), currency: payment.payableCurrency ?? currency });
        }
        setFrameLoaded(false);
        setCheckoutUrl(payment.checkoutUrl);
        setStage("checkout");
      } else {
        const checkout = await postJson("orders/checkout", { provider: "paymob" }, token);
        orderRef.current = checkout.orderId;
        if (checkout.payableAmount) {
          setPayable({ amount: Number(checkout.payableAmount), currency: checkout.payableCurrency ?? currency });
        }
        setFrameLoaded(false);
        setCheckoutUrl(checkout.checkoutUrl);
        setStage("checkout");
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not start the payment.");
      setStage("failed");
    } finally {
      setBusy(false);
      payingRef.current = false;
    }
  }

  /** Test mode: simulated card processing → real backend pipeline, no charge. */
  async function payTestMode(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setTermsError("Please accept the Terms & Conditions to continue.");
      return;
    }
    setTermsError(null);
    const digits = cardNumber.replace(/\s/g, "");
    if (!/^\d{13,19}$/.test(digits) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvc) || !nameOnCard.trim()) {
      setPayError("Check the card details — number, expiry, CVC and name are all required.");
      return;
    }
    if (payingRef.current) return;
    payingRef.current = true;
    setBusy(true);
    setPayError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const token = getStoredAuthToken();
      if (!token) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (isBooking) {
        const payment = await postJson("payments", { bookingId, provider: "mock" }, token);
        await postJson(`payments/mock/${payment.id}/complete`, undefined, token);
        await waitForBooking(bookingId!);
      } else {
        const order = await postJson("orders", undefined, token);
        clear();
        router.push(`/order-success?order=${order.id}`);
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "The test payment failed.");
      setStage("failed");
    } finally {
      setBusy(false);
      payingRef.current = false;
    }
  }

  // ---- render ----

  if (!authResolved) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <p className="text-sm" style={{ color: theme.muted }}>Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: theme.bg }}>
        <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: theme.cardLight, border: `1px solid ${theme.line}` }}>
          <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: ACCENT }}>Gymholic · Secure checkout</p>
          <p className="text-sm mb-6" style={{ color: theme.muted }}>
            You need a Gymholic account to pay — your purchase is tied to it.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`/login?next=${encodeURIComponent("/pay" + window.location.search)}`} className="w-full text-white font-semibold py-3 rounded-xl" style={{ background: theme.ink }}>
              Sign in to pay
            </Link>
            <Link href="/register" className="w-full font-semibold py-3 rounded-xl" style={{ border: `1px solid ${theme.line}`, color: theme.ink }}>
              Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success terminal (bookings; orders redirect to /order-success instead).
  if (stage === "success" && result) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: theme.bg }}>
        <div className="w-full max-w-md rounded-2xl p-10 text-center" style={{ background: theme.cardLight, border: `1px solid ${theme.line}` }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.10)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 12.5L9.5 18L20 6.5" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.ink }}>Payment received</h1>
          <p className="text-sm mb-8" style={{ color: theme.muted }}>
            Booking {result.ref} is confirmed — your calendar invite and receipt are on the way by email.
          </p>
          {result.meetLink && (
            <a href={result.meetLink} target="_blank" rel="noreferrer" className="inline-block w-full mb-3 text-white font-semibold py-3 rounded-xl" style={{ background: ACCENT }}>
              Join the Google Meet
            </a>
          )}
          <div className="flex gap-3">
            <Link href="/account?tab=bookings" className="flex-1 font-semibold py-3 rounded-xl text-center" style={{ border: `1px solid ${theme.line}`, color: theme.ink }}>
              My bookings
            </Link>
            <Link href="/" className="flex-1 font-semibold py-3 rounded-xl text-center" style={{ border: `1px solid ${theme.line}`, color: theme.ink }}>
              Back home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-12" style={{ background: theme.bg }}>
      <div className="max-w-[1120px] mx-auto">

        {/* ---- Header: brand first, this is Gymholic's checkout ---- */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <span className="rounded-xl px-4 py-2.5 flex items-center" style={{ background: theme.cardDark }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gymholic-logo.png" alt="Gymholic" className="h-7 w-auto" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] leading-none" style={{ color: ACCENT }}>
                Secure checkout
              </p>
              <p className="text-xs mt-1.5" style={{ color: theme.muted }}>Complete your purchase securely</p>
            </div>
          </div>
          <Link
            href={isBooking ? "/book" : "/checkout"}
            className="text-sm hover:opacity-70"
            style={{ color: theme.muted }}
          >
            &larr; {isBooking ? "Back to booking" : "Back to checkout"}
          </Link>
        </header>

        <div className="grid md:grid-cols-[45fr_55fr] gap-6 items-start">

          {/* ---- Left: the order, compact and product-like ---- */}
          <section
            className="rounded-2xl p-6 md:p-7 relative overflow-hidden text-white"
            style={{
              background: theme.cardDark,
              border: `1px solid ${theme.cardDarkLine}`,
            }}
          >
            {/* Subtle brand glow, top-right */}
            <div
              className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
              style={{ background: "radial-gradient(circle at top right, rgba(255,106,42,0.16) 0%, transparent 70%)" }}
              aria-hidden
            />
            <p className="text-[11px] uppercase tracking-[0.25em] mb-5" style={{ color: ACCENT }}>
              Your order
            </p>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3.5 items-center relative">
                  <ProductTile id={item.id} name={item.name} isBooking={isBooking} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium leading-snug truncate">{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: theme.mutedDark }}>{item.kind}</p>
                  </div>
                  <p className="text-sm font-medium shrink-0">{money(item.price, currency)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 space-y-2.5 relative" style={{ borderTop: `1px solid ${theme.cardDarkLine}` }}>
              <div className="flex justify-between text-sm" style={{ color: theme.mutedDark }}>
                <span>Subtotal</span>
                <span>{money(total, currency)}</span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-sm" style={{ color: theme.mutedDark }}>Total</span>
                <span className="text-[26px] font-bold leading-none">{money(total, currency)}</span>
              </div>
              {showConversion && effectivePayable && (
                <div className="flex justify-between items-end pt-3 mt-1" style={{ borderTop: `1px solid ${theme.cardDarkLine}` }}>
                  <span className="text-sm" style={{ color: ACCENT }}>Payment amount</span>
                  <span className="text-[26px] font-bold leading-none" style={{ color: ACCENT }}>
                    {money(effectivePayable.amount, effectivePayable.currency)}
                  </span>
                </div>
              )}
            </div>
            {showConversion && (
              <p className="text-xs mt-2.5 relative" style={{ color: theme.mutedDark }}>
                Charged in Egyptian Pounds — USD {total.toFixed(2)} converted at the current rate.
              </p>
            )}

            {/* After payment — reassurance before paying */}
            <div className="mt-6 pt-5 relative" style={{ borderTop: `1px solid ${theme.cardDarkLine}` }}>
              <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: theme.mutedDark }}>
                After payment
              </p>
              <ul className="space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.8)" }}>
                {(isBooking
                  ? [
                      "Your consultation slot is confirmed",
                      "You'll receive your Google Meet invite",
                      "Your receipt will arrive by email",
                      "Free cancellation up to 12 hours before — full refund",
                      "Reschedule up to 12 hours before",
                    ]
                  : [
                      "Payment confirmed instantly",
                      "Your purchase is linked to this account",
                      "Open it any time — receipts emailed to you",
                    ]
                ).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}><IconCheck width={14} height={14} /></span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs mt-6 relative" style={{ color: theme.mutedDark }}>
              Purchased as <span className="text-white/85">{user.email}</span>
            </p>
          </section>

          {/* ---- Right: payment, clean and focused ---- */}
          <section
            className="rounded-2xl p-6 md:p-7"
            style={{ background: theme.cardLight, border: `1px solid ${theme.line}`, boxShadow: "0 1px 2px rgba(20,20,20,0.04)" }}
          >
            {stage === "checkout" && checkoutUrl ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] mb-1.5" style={{ color: ACCENT }}>Payment</p>
                <p className="text-lg font-semibold mb-0.5" style={{ color: theme.ink }}>Complete your payment</p>
                <p className="text-xs mb-5" style={{ color: theme.muted }}>Securely processed by Paymob</p>

                {/* Paymob owns everything inside this box — payment method,
                    card fields, amount and its own branding. We only frame
                    it intentionally; skeleton until loaded. */}
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.line}` }}>
                  <div className="relative" style={{ height: "clamp(460px, 72vh, 640px)" }}>
                    <iframe
                      src={checkoutUrl}
                      title="Secure card payment"
                      onLoad={() => setFrameLoaded(true)}
                      className="w-full h-full transition-opacity duration-300"
                      style={{ border: "none", background: "#fff", opacity: frameLoaded ? 1 : 0 }}
                      allow="clipboard-write"
                    />
                    {!frameLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "#fff" }}>
                        <div
                          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: ACCENT, borderTopColor: "transparent" }}
                        />
                        <div className="w-40 h-2 rounded-full overflow-hidden" style={{ background: "rgba(20,20,20,0.06)" }}>
                          <div className="viewer-loading-bar h-full w-full" style={{ background: ACCENT }} />
                        </div>
                        <p className="text-xs" style={{ color: theme.muted }}>Loading the secure card form…</p>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs mt-4 text-center flex items-center justify-center gap-1.5" style={{ color: theme.muted }}>
                  <IconLock width={13} height={13} /> Your payment details are securely processed by Paymob.
                </p>
                <p className="text-[11px] mt-2 text-center" style={{ color: "rgba(20,20,20,0.35)" }}>
                  Having trouble with the embedded checkout?{" "}
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                    Open secure payment in a new window →
                  </a>
                </p>
              </div>
            ) : stage === "confirming" ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-5" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                <p className="text-sm font-medium mb-1" style={{ color: theme.ink }}>Payment received — confirming…</p>
                <p className="text-xs" style={{ color: theme.muted }}>This usually takes a few seconds.</p>
              </div>
            ) : provider === null ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-5" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                <p className="text-xs" style={{ color: theme.muted }}>Preparing secure payment…</p>
              </div>
            ) : provider === "none" ? (
              <div className="py-20 text-center">
                <p className="text-sm mb-2" style={{ color: theme.ink }}>Payments unavailable</p>
                <p className="text-xs" style={{ color: theme.muted }}>No gateway is configured — please check back shortly.</p>
              </div>
            ) : provider === "mock" ? (
              <form onSubmit={payTestMode}>
                <p className="text-[11px] uppercase tracking-[0.25em] mb-1.5" style={{ color: ACCENT }}>Payment</p>
                <p className="text-lg font-semibold mb-1" style={{ color: theme.ink }}>Pay securely</p>
                <p className="text-xs mb-5" style={{ color: theme.muted }}>Credit / Debit Card</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full mb-5" style={{ background: "rgba(255,106,42,0.10)", color: ACCENT }}>
                  Test mode — no real charge
                </span>
                <TestCardForm
                  cardNumber={cardNumber}
                  expiry={expiry}
                  cvc={cvc}
                  nameOnCard={nameOnCard}
                  brand={brand}
                  onChange={{ setCardNumber, setExpiry, setCvc, setNameOnCard }}
                />
                <div className="mt-5">
                  <TermsAcceptance checked={termsAccepted} onChange={setTermsAccepted} error={termsError} light />
                </div>
                {payError && (
                  <p className="text-xs mt-3" style={{ color: "#dc2626" }} role="alert">{payError}</p>
                )}
                <button type="submit" disabled={busy} className="w-full text-white font-semibold py-3.5 rounded-xl mt-4 disabled:opacity-60 transition-opacity" style={{ background: theme.ink }}>
                  {busy ? "Processing…" : `Pay ${money(total, currency)}`}
                </button>
              </form>
            ) : (
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] mb-1.5" style={{ color: ACCENT }}>Payment</p>
                <p className="text-lg font-semibold mb-0.5" style={{ color: theme.ink }}>Complete your payment</p>
                <p className="text-xs mb-6" style={{ color: theme.muted }}>Securely processed by Paymob</p>

                {/* Card preview — brand-black with the orange accent */}
                <div className="rounded-2xl p-5 mb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #161616 0%, #26180e 100%)", border: `1px solid ${theme.cardDarkLine}` }}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-9 h-7 rounded" style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5d97a 100%)" }} aria-hidden />
                    <span className="text-xs font-semibold tracking-widest text-white/90">{brand ?? "CARD"}</span>
                  </div>
                  <p className="font-mono tracking-[0.18em] text-white text-sm mb-3">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </p>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/50">
                    <span>{nameOnCard || "Cardholder name"}</span>
                    <span>{expiry || "MM/YY"}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <CardBrandRow highlight={brand} />
                </div>

                <div className="mb-6">
                  <TermsAcceptance checked={termsAccepted} onChange={setTermsAccepted} error={termsError} light />
                </div>

                {payError && (
                  <p className="text-xs mb-4" style={{ color: "#dc2626" }} role="alert">{payError}</p>
                )}

                <button
                  type="button"
                  onClick={() => payWithPaymob().catch(() => {})}
                  disabled={busy || !termsAccepted}
                  className="w-full text-white font-semibold py-3.5 rounded-xl disabled:opacity-60 transition-opacity"
                  style={{ background: ACCENT }}
                >
                  {busy
                    ? "Opening secure card form…"
                    : effectivePayable
                      ? `Pay ${money(effectivePayable.amount, effectivePayable.currency)}`
                      : `Pay ${money(total, currency)}`}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ---- One clean trust line, no badge soup ---- */}
        <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs" style={{ color: theme.muted }}>
          <span className="inline-flex items-center gap-1.5"><IconLock width={13} height={13} /> Your payment is securely processed by Paymob.</span>
          <span aria-hidden>·</span>
          <Link href="/terms" className="underline hover:no-underline">Terms</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="underline hover:no-underline">Privacy</Link>
          <span aria-hidden>·</span>
          <Link href="/#contact" className="underline hover:no-underline">Support</Link>
        </footer>
      </div>
    </main>
  );
}

/** Product tile: real store cover when one exists (blueprints), glyph otherwise. */
function ProductTile({ id, name, isBooking }: { id: string; name: string; isBooking: boolean }) {
  const [failed, setFailed] = useState(false);
  const showCover = !isBooking && !failed;
  return (
    <div
      className="w-12 h-16 rounded-lg shrink-0 flex items-center justify-center overflow-hidden text-xl"
      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.cardDarkLine}` }}
      aria-hidden
    >
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={storeCoverUrl(id)}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{isBooking ? <IconCalendar width={22} height={22} /> : name.trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

/** Light-mode variant of the card fields (test mode only — the real card
 *  form is Paymob's embedded iframe, so card data never touches us). */
function TestCardForm({
  cardNumber,
  expiry,
  cvc,
  nameOnCard,
  brand,
  onChange,
}: {
  cardNumber: string;
  expiry: string;
  cvc: string;
  nameOnCard: string;
  brand: string | null;
  onChange: {
    setCardNumber: (v: string) => void;
    setExpiry: (v: string) => void;
    setCvc: (v: string) => void;
    setNameOnCard: (v: string) => void;
  };
}) {
  const inputStyle = {
    background: "#fff",
    color: theme.ink,
    border: `1px solid ${theme.line}`,
  };
  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium" style={{ color: theme.muted }}>Card Number</span>
        <div className="relative">
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            value={cardNumber}
            onChange={(e) => onChange.setCardNumber(formatCardNumber(e.target.value))}
            className="rounded-xl px-4 py-3 text-sm outline-none w-full font-mono tracking-wider focus:ring-2"
            style={inputStyle}
          />
          {brand && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-2 py-1 rounded" style={{ background: theme.ink, color: "#fff" }}>
              {brand}
            </span>
          )}
        </div>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: theme.muted }}>Expiration</span>
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => onChange.setExpiry(formatExpiry(e.target.value))}
            className="rounded-xl px-4 py-3 text-sm outline-none w-full font-mono tracking-wider focus:ring-2"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: theme.muted }}>CVC</span>
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={(e) => onChange.setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-xl px-4 py-3 text-sm outline-none w-full font-mono tracking-wider focus:ring-2"
            style={inputStyle}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium" style={{ color: theme.muted }}>Name on Card</span>
        <input
          autoComplete="cc-name"
          placeholder="As printed on the card"
          value={nameOnCard}
          onChange={(e) => onChange.setNameOnCard(e.target.value)}
          className="rounded-xl px-4 py-3 text-sm outline-none w-full focus:ring-2"
          style={inputStyle}
        />
      </label>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <p className="text-sm" style={{ color: theme.muted }}>Loading…</p>
      </main>
    }>
      <PayPageContent />
    </Suspense>
  );
}
