"use client";

import Link from "next/link";

/**
 * Required acceptance of the Terms & Privacy Policy (including the
 * cancellation and missed-session policies) before any payment.
 */
export function TermsAcceptance({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
}) {
  return (
    <div className="mb-2">
      <label className="flex items-start gap-2.5 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 mt-0.5 shrink-0"
          style={{ accentColor: "var(--orange)" }}
        />
        <span className="opacity-70">
          I accept the{" "}
          <Link href="/terms" target="_blank" className="underline hover:no-underline">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="underline hover:no-underline">
            Privacy Policy
          </Link>
          , including the payment, cancellation and missed-session policies.
        </span>
      </label>
      {error && (
        <p className="text-xs mt-1.5" style={{ color: "var(--orange)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
