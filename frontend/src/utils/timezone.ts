/**
 * Timezone utilities for booking system.
 * 
 * The booking system uses:
 * - UTC Instant (absolute time) for storage
 * - IANA timezone IDs (e.g., "Asia/Dubai", "Africa/Cairo") for context
 * - Local display times converted from UTC
 * 
 * IMPORTANT:
 * - Never manually convert time strings (e.g., "10:00" → "12:00")
 * - Always use the UTC instant from the backend
 * - Display in user's timezone using browser APIs
 */

/**
 * Detect the user's current IANA timezone.
 * 
 * Examples:
 * - "Asia/Dubai"
 * - "Africa/Cairo"
 * - "America/New_York"
 * - "Europe/London"
 * 
 * @returns IANA timezone ID
 */
export function detectUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Validate if a string is a valid IANA timezone ID.
 * 
 * @param timezone - Timezone string to validate
 * @returns true if valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format an ISO instant string in a specific timezone.
 * 
 * @param instantString - ISO string (e.g., "2026-08-15T08:00:00Z")
 * @param timezone - IANA timezone ID
 * @param format - "time" (HH:MM), "date" (MMM DD), "datetime" (MMM DD, HH:MM)
 * @returns Formatted string
 */
export function formatInTimezone(
  instantString: string,
  timezone: string,
  format: 'time' | 'date' | 'datetime' = 'time'
): string {
  const date = new Date(instantString);
  
  if (isNaN(date.getTime())) {
    console.error('Invalid instant string:', instantString);
    return 'Invalid date';
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (format) {
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
      break;
    case 'date':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'datetime':
      options.month = 'short';
      options.day = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
      break;
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Get the timezone offset string for display.
 * Example: "GMT+4" for Dubai, "GMT+2" for Cairo
 * 
 * @param timezone - IANA timezone ID
 * @param atDate - Optional date to check offset (for DST)
 * @returns Offset string like "GMT+4"
 */
export function getTimezoneOffset(timezone: string, atDate?: Date): string {
  const date = atDate || new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });

  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName');
  
  return offsetPart?.value || 'GMT';
}

/**
 * Convert a UTC instant to a date object in a specific timezone.
 * Useful for getting date components (year, month, day, hour, minute).
 * 
 * @param instantString - ISO string (e.g., "2026-08-15T08:00:00Z")
 * @param timezone - IANA timezone ID
 * @returns Object with date/time components
 */
export function getDatePartsInTimezone(
  instantString: string,
  timezone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
} {
  const date = new Date(instantString);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  return {
    year: parseInt(getValue('year')),
    month: parseInt(getValue('month')),
    day: parseInt(getValue('day')),
    hour: parseInt(getValue('hour')),
    minute: parseInt(getValue('minute')),
    weekday: getValue('weekday'),
  };
}

/**
 * Check if a date is today in a specific timezone.
 * 
 * @param instantString - ISO string
 * @param timezone - IANA timezone ID
 * @returns true if the date is today in that timezone
 */
export function isToday(instantString: string, timezone: string): boolean {
  const instant = getDatePartsInTimezone(instantString, timezone);
  const now = getDatePartsInTimezone(new Date().toISOString(), timezone);
  
  return (
    instant.year === now.year &&
    instant.month === now.month &&
    instant.day === now.day
  );
}

/**
 * Format a booking time range for display.
 * Example: "12:00 - 12:45 (Dubai time, GMT+4)"
 * 
 * @param startInstant - Start time ISO string
 * @param endInstant - End time ISO string
 * @param timezone - IANA timezone ID
 * @returns Formatted range string
 */
export function formatTimeRange(
  startInstant: string,
  endInstant: string,
  timezone: string
): string {
  const startTime = formatInTimezone(startInstant, timezone, 'time');
  const endTime = formatInTimezone(endInstant, timezone, 'time');
  const offset = getTimezoneOffset(timezone);
  
  // Extract timezone name (e.g., "Asia/Dubai" → "Dubai")
  const tzName = timezone.split('/').pop() || timezone;
  
  return `${startTime} - ${endTime} (${tzName} time, ${offset})`;
}
