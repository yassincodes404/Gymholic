"use client";

import { useState, type FormEvent } from "react";

type PaymentFormProps = {
  amountLabel: string;
  submitLabel: string;
  /** Called once simulated card processing succeeds — the caller does the
   * real work (persist order/booking, send email) and navigates onward. */
  onSuccess: () => Promise<void> | void;
  showWallets?: boolean;
};

type Status = "idle" | "processing" | "error";

const fieldStyle = {
  background: "var(--surface)",
  color: "var(--paper)",
  border: "1px solid rgba(245,241,232,0.15)",
};

/**
 * No real payment gateway is connected — card processing is simulated
 * (a timed delay standing in for a real gateway round-trip), exactly as
 * asked: never pretend a real transaction happened. The seam is
 * `onSuccess`: swap the simulated delay below for a real
 * `stripe.confirmCardPayment(...)` (or equivalent) call and nothing else
 * in this component or its callers needs to change.
 */
export function PaymentForm({ amountLabel, submitLabel, onSuccess, showWallets = false }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");

  function validate() {
    const next: Record<string, string> = {};
    const digits = cardNumber.replace(/\s/g, "");
    if (!/^\d{13,19}$/.test(digits)) next.cardNumber = "Enter a valid card number.";
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) {
      next.expiry = "Use MM/YY.";
    } else {
      const [mm, yy] = expiry.split("/").map((s) => parseInt(s.trim(), 10));
      const now = new Date();
      const expDate = new Date(2000 + yy, mm);
      if (mm < 1 || mm > 12) next.expiry = "Invalid month.";
      else if (expDate < now) next.expiry = "Card has expired.";
    }
    if (!/^\d{3,4}$/.test(cvc)) next.cvc = "Enter a valid security code.";
    if (!nameOnCard.trim()) next.nameOnCard = "Required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("processing");
    try {
      // Simulated gateway round-trip — see component note above.
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await onSuccess();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <p className="text-sm tracking-widest uppercase mb-2" style={{ color: "var(--orange)" }}>
        Payment
      </p>
      <p className="text-sm opacity-60 mb-6">All transactions are secure and encrypted.</p>

      {showWallets && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {["Apple Pay", "Google Pay"].map((wallet) => (
            <div
              key={wallet}
              className="rounded-lg px-4 py-3 text-center text-sm opacity-40 cursor-not-allowed"
              style={fieldStyle}
              title="Demo mode — connect a payment provider to enable this."
            >
              {wallet} <span className="text-xs">(Demo)</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(245,241,232,0.08)" }}>
          VISA
        </span>
        <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(245,241,232,0.08)" }}>
          Mastercard
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Card Number</span>
          <input
            inputMode="numeric"
            placeholder="1234 1234 1234 1234"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={{
              ...fieldStyle,
              border: errors.cardNumber ? "1px solid var(--orange)" : fieldStyle.border,
            }}
          />
          {errors.cardNumber && <span className="text-xs" style={{ color: "var(--orange)" }}>{errors.cardNumber}</span>}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm opacity-60">Expiration Date</span>
            <input
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
              style={fieldStyle}
            />
            {errors.expiry && <span className="text-xs" style={{ color: "var(--orange)" }}>{errors.expiry}</span>}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm opacity-60">Security Code</span>
            <input
              inputMode="numeric"
              placeholder="CVC"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
              style={fieldStyle}
            />
            {errors.cvc && <span className="text-xs" style={{ color: "var(--orange)" }}>{errors.cvc}</span>}
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Name on Card</span>
          <input
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value)}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={fieldStyle}
          />
          {errors.nameOnCard && <span className="text-xs" style={{ color: "var(--orange)" }}>{errors.nameOnCard}</span>}
        </label>

        {status === "error" && (
          <p className="text-sm" style={{ color: "var(--orange)" }}>
            Something went wrong. Please try again.
          </p>
        )}

        <button type="submit" disabled={status === "processing"} className="btn-pill w-full justify-center mt-2">
          {status === "processing" ? "Processing…" : `${submitLabel} ${amountLabel}`}
        </button>
      </form>
    </div>
  );
}
