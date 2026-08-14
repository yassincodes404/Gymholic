export type CustomerInfo = {
  email: string;
  fullName: string;
  country: string;
  phone: string;
};

type CheckoutFormProps = {
  values: CustomerInfo;
  onChange: (values: CustomerInfo) => void;
};

const fieldStyle = {
  background: "var(--surface)",
  color: "var(--paper)",
  border: "1px solid rgba(245,241,232,0.15)",
};

/** Digital-product checkout — no shipping address, postal code, or shipping method. */
export function CheckoutForm({ values, onChange }: CheckoutFormProps) {
  const set = <K extends keyof CustomerInfo>(key: K, val: string) => onChange({ ...values, [key]: val });

  return (
    <div>
      <p className="text-sm tracking-widest uppercase mb-6" style={{ color: "var(--orange)" }}>
        Customer Information
      </p>
      <div className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Email Address</span>
          <input
            required
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={fieldStyle}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Full Name</span>
          <input
            required
            type="text"
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={fieldStyle}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Country / Region</span>
          <input
            required
            type="text"
            value={values.country}
            onChange={(e) => set("country", e.target.value)}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={fieldStyle}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Phone Number <span className="opacity-40">(optional)</span></span>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={fieldStyle}
          />
        </label>
      </div>
    </div>
  );
}
