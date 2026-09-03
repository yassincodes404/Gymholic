"use client";

import { useState } from "react";
import { services } from "@/lib/content";
import { CountrySelect } from "@/components/booking/CountrySelect";
import { filterPhoneInput, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";
import {
  IconCheck,
  IconGlobe,
  IconMail,
  IconNote,
  IconPhone,
  IconUser,
} from "@/components/account/icons";

export type BookingDetails = {
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
  country: string;
  referral: string;
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
  referral: "",
  topic: "",
  message: "",
};

/**
 * Field-level validation for the booking details, shared by the form's
 * inline errors and the review step's continue gate. WhatsApp is optional
 * but must still be a real number when typed.
 */
export function bookingDetailsErrors(
  details: BookingDetails
): Partial<Record<keyof BookingDetails, string | null>> {
  return {
    fullName: validateName(details.fullName, "Full name"),
    email: validateEmail(details.email),
    phone: validatePhone(details.phone),
    whatsapp: validatePhone(details.whatsapp, { optional: true }),
    company: validateText(details.company, "Company name", { optional: true, max: 120 }),
    country: details.country.trim() ? null : "Select your country.",
    topic: details.topic.trim() ? null : "Select a consultation topic.",
    message: validateText(details.message, "Message", { optional: true, max: 2000 }),
  };
}

const REFERRAL_SOURCES = [
  "Instagram",
  "Google",
  "TikTok",
  "Friend or family",
  "LinkedIn",
  "YouTube",
  "Other",
];

const fieldStyle = {
  background: "var(--surface)",
  color: "var(--paper)",
  border: "1px solid rgba(245,241,232,0.15)",
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.25em] col-span-1 sm:col-span-2 mt-2 first:mt-0" style={{ color: "var(--orange)" }}>
      {children}
    </p>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-sm opacity-60">
      {children} {optional && <span className="opacity-50">(optional)</span>}
    </span>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <span className="text-xs" style={{ color: "#ff8a5c" }} role="alert">
      {message}
    </span>
  );
}

export function BookingDetailsForm({
  values,
  onChange,
  lockedPhone = false,
}: {
  values: BookingDetails;
  onChange: (values: BookingDetails) => void;
  /** True for signed-in users: the phone stays tied to the account and can
   *  only be changed from Account Settings. */
  lockedPhone?: boolean;
}) {
  const set = <K extends keyof BookingDetails>(key: K, val: string) => onChange({ ...values, [key]: val });
  const errors = bookingDetailsErrors(values);
  // Errors show after a field was touched (or has content) so users aren't
  // yelled at mid-typing; the review step gates on the same validator anyway.
  const showError = (key: keyof BookingDetails) =>
    (touched[key] || values[key].trim() !== "") && !lockedField(key) ? errors[key] : undefined;

  // The locked account phone renders read-only — never flag it.
  function lockedField(key: keyof BookingDetails) {
    return key === "phone" && lockedPhone;
  }
  const [touched, setTouched] = useState<Partial<Record<keyof BookingDetails, boolean>>>({});
  const markTouched = (key: keyof BookingDetails) => setTouched((t) => ({ ...t, [key]: true }));

  return (
    <div>
      <p className="text-sm tracking-widest uppercase mb-6" style={{ color: "var(--orange)" }}>
        Your Details
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        <SectionLabel>Contact</SectionLabel>

        <label className="flex flex-col gap-2">
          <FieldLabel>Full Name</FieldLabel>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconUser width={15} height={15} /></span>
            <input
              required
              value={values.fullName}
              maxLength={100}
              autoComplete="name"
              onChange={(e) => set("fullName", e.target.value)}
              onBlur={() => markTouched("fullName")}
              className="field-input rounded-lg pl-11 pr-4 py-3 text-sm outline-none w-full"
              style={fieldStyle}
            />
          </div>
          <FieldError message={showError("fullName")} />
        </label>
        <label className="flex flex-col gap-2">
          <FieldLabel>Email Address</FieldLabel>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconMail width={15} height={15} /></span>
            <input
              required
              type="email"
              value={values.email}
              maxLength={255}
              autoComplete="email"
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => markTouched("email")}
              className="field-input rounded-lg pl-11 pr-4 py-3 text-sm outline-none w-full"
              style={fieldStyle}
            />
          </div>
          <FieldError message={showError("email")} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-60">
            Phone Number{" "}
            {lockedPhone && <span className="opacity-50">&middot; locked to your account</span>}
          </span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconPhone width={15} height={15} /></span>
            <input
              required
              type="tel"
              value={values.phone}
              readOnly={lockedPhone}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => set("phone", filterPhoneInput(e.target.value))}
              onBlur={() => markTouched("phone")}
              className="field-input rounded-lg pl-11 pr-4 py-3 text-sm outline-none w-full"
              style={{
                ...fieldStyle,
                cursor: lockedPhone ? "not-allowed" : undefined,
                opacity: lockedPhone ? 0.75 : 1,
              }}
              title={lockedPhone ? "Update your phone number in Account Settings" : undefined}
            />
          </div>
          {!lockedPhone && <FieldError message={showError("phone")} />}
          {lockedPhone && (
            <span className="text-xs opacity-40">
              To change it, update your phone in Account Settings.
              {errors.phone ? " This saved number is not a valid phone — fix it in Account → Profile first." : ""}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-sm opacity-60">
            <span>WhatsApp Number <span className="opacity-50">(optional)</span></span>
            {values.whatsapp !== values.phone && values.phone.trim() !== "" && (
              <button
                type="button"
                onClick={() => set("whatsapp", values.phone)}
                className="inline-flex items-center gap-1 text-xs hover:opacity-100"
                style={{ color: "var(--orange)" }}
              >
                <IconCheck width={11} height={11} />
                Same as phone
              </button>
            )}
          </span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconPhone width={15} height={15} /></span>
            <input
              type="tel"
              value={values.whatsapp}
              inputMode="tel"
              onChange={(e) => set("whatsapp", filterPhoneInput(e.target.value))}
              onBlur={() => markTouched("whatsapp")}
              className="field-input rounded-lg pl-11 pr-4 py-3 text-sm outline-none w-full"
              style={fieldStyle}
            />
          </div>
          <FieldError message={showError("whatsapp")} />
          <span className="text-xs opacity-40">Used for session updates on WhatsApp, if you like.</span>
        </label>

        <SectionLabel>About you</SectionLabel>

        <label className="flex flex-col gap-2">
          <FieldLabel optional>Gym / Company Name</FieldLabel>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconNote width={15} height={15} /></span>
            <input
              value={values.company}
              maxLength={120}
              onChange={(e) => set("company", e.target.value)}
              onBlur={() => markTouched("company")}
              className="field-input rounded-lg pl-11 pr-4 py-3 text-sm outline-none w-full"
              style={fieldStyle}
            />
          </div>
          <FieldError message={showError("company")} />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-sm opacity-60">Country</span>
          <CountrySelect value={values.country} onChange={(country) => { set("country", country); markTouched("country"); }} required />
          <FieldError message={showError("country")} />
        </div>
        <div className="flex flex-col gap-2.5 sm:col-span-2">
          <span className="text-sm opacity-60">Where did you hear about us? <span className="opacity-50">(optional)</span></span>
          <div className="flex flex-wrap gap-2">
            {REFERRAL_SOURCES.map((source) => {
              const selected = values.referral === source;
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => set("referral", selected ? "" : source)}
                  aria-pressed={selected}
                  className={`tab-chip ${selected ? "tab-chip-active" : ""}`}
                >
                  {selected && <IconCheck width={12} height={12} />}
                  {source}
                </button>
              );
            })}
          </div>
        </div>

        <SectionLabel>Your session</SectionLabel>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <FieldLabel>Consultation Topic</FieldLabel>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IconGlobe width={15} height={15} /></span>
            <select required value={values.topic} onChange={(e) => { set("topic", e.target.value); markTouched("topic"); }} className="field-input appearance-none rounded-lg pl-11 pr-10 py-3 text-sm outline-none w-full" style={fieldStyle}>
              <option value="">Select...</option>
              {services.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none rotate-[-90deg]"><IconChevronSmall /></span>
          </div>
          <FieldError message={showError("topic")} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <FieldLabel optional>What would you like to discuss?</FieldLabel>
          <textarea
            rows={4}
            value={values.message}
            maxLength={2000}
            onChange={(e) => set("message", e.target.value)}
            onBlur={() => markTouched("message")}
            className="field-input rounded-lg px-4 py-3 text-sm outline-none w-full"
            style={fieldStyle}
          />
          <FieldError message={showError("message")} />
        </label>
      </div>
    </div>
  );
}

function IconChevronSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9.4 6 6 6-6" />
    </svg>
  );
}
