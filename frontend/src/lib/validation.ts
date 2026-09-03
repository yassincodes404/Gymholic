/*!
 * Shared field validators for user-typed data (booking details, profile).
 * Client-side checks mirror the backend's Bean Validation so users get
 * instant feedback; the backend stays the source of truth.
 */

/** Free-form phone: optional leading +, then digits/spaces/()/-. */
const PHONE_CHARS_PATTERN = /^\+?[0-9\s\-().]*$/;

/** Names: start with a letter, then letters, spaces, apostrophes, hyphens, periods. */
const NAME_PATTERN = /^[\p{L}][\p{L}\s'.\-]*$/u;

/** Plausible email — deliberately looser than RFC 5322, strict enough to catch typos. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalizes any human-typed phone to E.164 (+<digits>). Returns null when
 * the number can't be a real phone (too few/many digits) — Mirrors the
 * backend's PhoneUtils.toE164.
 */
export function toE164(value: string): string | null {
  const digits = digitsOf(value);
  if (digits.length < 8 || digits.length > 15) return null;
  return "+" + digits;
}

export function validatePhone(value: string, options?: { optional?: boolean }): string | null {
  const trimmed = value.trim();
  if (!trimmed) return options?.optional ? null : "A phone number is required.";
  if (!PHONE_CHARS_PATTERN.test(trimmed)) {
    return "Only digits, spaces, ( ) - . and a leading + are allowed.";
  }
  if (!toE164(trimmed)) {
    return "Enter a valid number — 8 to 15 digits including the country code.";
  }
  return null;
}

export function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > 100) return `${label} must be at most 100 characters.`;
  if (!NAME_PATTERN.test(trimmed)) {
    return `${label} may only contain letters, spaces, apostrophes, hyphens and periods.`;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "An email address is required.";
  if (trimmed.length > 255) return "Email must be at most 255 characters.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return null;
}

/** Optional-or-required free text with a length cap (booking message, bio…). */
export function validateText(
  value: string,
  label: string,
  options?: { optional?: boolean; max?: number }
): string | null {
  const trimmed = value.trim();
  const max = options?.max ?? 2000;
  if (!trimmed) return options?.optional ? null : `${label} is required.`;
  if (trimmed.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

/** Strips characters a phone field must never accept (letters, emoji, …). */
export function filterPhoneInput(value: string): string {
  return value.replace(/[^0-9+\s\-().]/g, "").slice(0, 24);
}
