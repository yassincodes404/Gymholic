/**
 * Shared between the client calendar and the booking API routes so both
 * agree on what a "slot" is. Business rules here (closed day, slot times)
 * are placeholders — swap them for Gymholic's real hours whenever ready.
 */

export const SLOT_TIMES = ["09:00 AM", "10:30 AM", "12:00 PM", "02:30 PM", "04:00 PM", "06:00 PM"];

/** Friday treated as the weekly closed day (common UAE business off-day) — adjust if wrong. */
const CLOSED_WEEKDAY = 5;

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function slotKey(dateKeyStr: string, time: string): string {
  return `slot:${dateKeyStr}:${time}`;
}

export function isPastDay(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isClosedDay(date: Date): boolean {
  return date.getDay() === CLOSED_WEEKDAY;
}

export type DayStatus = "available" | "fully-booked" | "unavailable" | "selected";

export function getDayStatus(date: Date, bookedTimesForDay: string[], isSelected: boolean): DayStatus {
  if (isSelected) return "selected";
  if (isPastDay(date) || isClosedDay(date)) return "unavailable";
  if (bookedTimesForDay.length >= SLOT_TIMES.length) return "fully-booked";
  return "available";
}

export function daysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
