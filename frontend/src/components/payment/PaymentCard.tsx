/*!
 * Shared payment chrome — every paid surface in Gymholic (consultation
 * booking, Blueprint checkout, Academy membership pre-pay) renders this
 * exact card so the customer always meets the same gateway: header with
 * the SSL-secured badge, one body slot, optional footer note.
 */
export function PaymentCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}>
      <div
        className="px-6 md:px-8 py-4 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid rgba(245,241,232,0.1)" }}
      >
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs opacity-50 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <span
          className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
          style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
        >
          &#128274; SSL secured
        </span>
      </div>
      <div className="p-6 md:p-8">{children}</div>
      {footer && (
        <div className="px-6 md:px-8 pb-6 md:pb-8 -mt-2">{footer}</div>
      )}
    </div>
  );
}

/** Accepted-card chip row; the detected brand is highlighted when given. */
export function CardBrandRow({ highlight }: { highlight?: string | null }) {
  const brands = [
    { name: "VISA", bg: "#1a1f71", fg: "#fff" },
    { name: "Mastercard", bg: "#2d2926", fg: "#fff" },
    { name: "AMEX", bg: null, fg: "var(--paper)" },
    { name: "Meeza", bg: null, fg: "var(--paper)" },
  ];
  return (
    <div className="flex items-center gap-2">
      {brands.map((brand) => {
        const active = highlight === brand.name;
        return (
          <span
            key={brand.name}
            className="text-[10px] tracking-wider px-2.5 py-1.5 rounded-md font-semibold transition-opacity"
            style={{
              background: brand.bg ?? "rgba(245,241,232,0.08)",
              color: brand.fg,
              border: active ? "1px solid var(--orange)" : "1px solid rgba(245,241,232,0.12)",
              opacity: highlight && !active ? 0.45 : 1,
            }}
          >
            {brand.name}
          </span>
        );
      })}
    </div>
  );
}

/** The single big amount line every payment surface shows before paying. */
export function TotalRow({ label = "Total due", amount, currency }: { label?: string; amount: number | string; currency?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <span className="text-sm opacity-60">{label}</span>
      <span className="display-text text-3xl" style={{ color: "var(--orange)" }}>
        {currency ? `${amount} ${currency}` : amount}
      </span>
    </div>
  );
}

/** Detected card brand from the typed number (for the chip highlight). */
export function detectCardBrand(cardNumber: string): string | null {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^4/.test(digits)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "AMEX";
  if (/^5[0-9]/.test(digits) || /^50/.test(digits)) return "Meeza";
  return null;
}
