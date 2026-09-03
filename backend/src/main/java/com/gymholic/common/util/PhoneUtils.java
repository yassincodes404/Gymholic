package com.gymholic.common.util;

/**
 * Phone number helpers shared by SMS verification, messaging and profile
 * validation. Numbers are stored and compared normalized to E.164
 * ("+201234567890"); human input stays free-form ("+20 123 456 7890").
 */
public final class PhoneUtils {

    private PhoneUtils() {
    }

    /**
     * Normalizes to E.164 by keeping digits only (a leading "+" is implied).
     * Returns null when the input can't be a real phone number — fewer than
     * 8 or more than 15 digits (ITU-T E.164 bounds).
     */
    public static String toE164(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() < 8 || digits.length() > 15) {
            return null;
        }
        return "+" + digits;
    }

    /**
     * Format gate for free-form input: only the characters a phone can
     * legitimately contain (digits, spaces, parentheses, hyphens, dots, one
     * leading +) AND a plausible digit count.
     */
    public static boolean isPlausiblePhone(String raw) {
        if (raw == null) {
            return false;
        }
        String trimmed = raw.trim();
        if (!trimmed.matches("\\+?[0-9\\s\\-().]+") || trimmed.length() > 24) {
            return false;
        }
        return toE164(trimmed) != null;
    }

    /**
     * Last-digits mask for UI and logs — "+20 •••• 1234" — so full numbers
     * never end up in log files or admin responses.
     */
    public static String mask(String e164) {
        if (e164 == null || e164.length() < 6) {
            return "••••";
        }
        return e164.substring(0, e164.length() - 4) + " •••• " + e164.substring(e164.length() - 4);
    }
}
