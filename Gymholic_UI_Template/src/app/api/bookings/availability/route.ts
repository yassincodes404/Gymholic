import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

/** GET /api/bookings/availability?month=YYYY-MM — booked times per date for calendar rendering. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  const keys = await kv.keysWithPrefix(`slot:${month}`);
  const bookedByDate: Record<string, string[]> = {};

  for (const key of keys) {
    // key shape: slot:YYYY-MM-DD:HH:MM AM/PM
    const match = key.match(/^slot:([\d-]+):(.+)$/);
    if (!match) continue;
    const [, date, time] = match;
    bookedByDate[date] = bookedByDate[date] || [];
    bookedByDate[date].push(time);
  }

  return NextResponse.json({ bookedByDate });
}
