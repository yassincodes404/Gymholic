/*!
  Payment return page — Paymob's Unified Checkout redirects here
  (redirection_url) after payment with query params (success, amount_cents,
  currency, order…). The booking itself is confirmed server-side by the
  HMAC-verified webhook; this page just tells the customer where they stand.
*/

"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function PaymentStatus() {
  const params = useSearchParams();

  // Embedded checkout: when Paymob's checkout iframe redirects here, tell
  // the parent booking page the outcome so it can finish the flow inline
  // instead of showing this full page inside the frame.
  useEffect(() => {
    if (typeof window === "undefined" || window.self === window.top) return;
    window.parent.postMessage(
      { type: "paymob-embedded-done", url: window.location.href },
      window.location.origin
    );
  }, []);

  const success = params.get("success") === "true";
  const pending = params.get("pending") === "true";
  const amountCents = Number(params.get("amount_cents") ?? "0") / 100;
  const currency = params.get("currency") ?? "";

  return (
    <main className="min-h-screen bg-void text-paper flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 ${
            success || pending
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {success || pending ? "✓" : "✕"}
        </div>

        {success ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Payment received</h1>
            <p className="text-paper/70 leading-relaxed mb-2">
              {amountCents > 0 && currency ? (
                <>
                  {currency === "EGP" ? `${amountCents.toLocaleString()} EGP` : `$${amountCents.toLocaleString()}`} paid.{" "}
                </>
              ) : null}
              Your purchase is being confirmed — you&apos;ll get a confirmation email
              within a minute (bookings include the calendar invite and meeting link).
            </p>
          </>
        ) : pending ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Payment pending</h1>
            <p className="text-paper/70 leading-relaxed mb-2">
              The payment is still processing. We&apos;ll email you as soon as it
              settles — no action needed from you.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Payment didn&apos;t go through</h1>
            <p className="text-paper/70 leading-relaxed mb-2">
              No money was taken. You can safely try again — your slot is still
              reserved for a short while.
            </p>
          </>
        )}

        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Link
            href="/account"
            className="bg-orange text-void font-semibold px-8 py-3 rounded-full hover:bg-orange/90 transition-colors"
          >
            View my bookings
          </Link>
          {!(success || pending) && (
            <Link
              href="/book"
              className="border border-paper/20 text-paper font-semibold px-8 py-3 rounded-full hover:border-orange/60 transition-colors"
            >
              Try again
            </Link>
          )}
        </div>

        <p className="text-sm text-paper/50 mt-8">
          <Link href="/" className="text-orange underline hover:no-underline">
            ← Back to gymholic.ae
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense>
      <PaymentStatus />
    </Suspense>
  );
}
