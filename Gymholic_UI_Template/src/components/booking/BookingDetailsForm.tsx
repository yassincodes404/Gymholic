import { services } from "@/lib/content";

export type BookingDetails = {
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
  country: string;
  topic: string;
  message: string;
};

export const emptyBookingDetails: BookingDetails = {
  fullName: "",
  email: "",
  phone: "",
  whatsapp: "",
  company: "",
  country: "",
  topic: "",
  message: "",
};

const fieldStyle = {
  background: "var(--surface)",
  color: "var(--paper)",
  border: "1px solid rgba(245,241,232,0.15)",
};

export function BookingDetailsForm({
  values,
  onChange,
}: {
  values: BookingDetails;
  onChange: (values: BookingDetails) => void;
}) {
  const set = <K extends keyof BookingDetails>(key: K, val: string) => onChange({ ...values, [key]: val });

  return (
    <div>
      <p className="text-sm tracking-widest uppercase mb-6" style={{ color: "var(--orange)" }}>
        Your Details
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Full Name</span>
          <input required value={values.fullName} onChange={(e) => set("fullName", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Email Address</span>
          <input required type="email" value={values.email} onChange={(e) => set("email", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Phone Number</span>
          <input required type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">WhatsApp Number</span>
          <input type="tel" value={values.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Gym / Company Name</span>
          <input value={values.company} onChange={(e) => set("company", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Country</span>
          <input required value={values.country} onChange={(e) => set("country", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm opacity-60">Consultation Topic</span>
          <select required value={values.topic} onChange={(e) => set("topic", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle}>
            <option value="">Select...</option>
            {services.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm opacity-60">What would you like to discuss? <span className="opacity-40">(optional)</span></span>
          <textarea rows={4} value={values.message} onChange={(e) => set("message", e.target.value)} className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full" style={fieldStyle} />
        </label>
      </div>
    </div>
  );
}
