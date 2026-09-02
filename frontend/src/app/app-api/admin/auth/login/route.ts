import { NextRequest, NextResponse } from "next/server";

/*!
  Server-side proxy for the admin login. The backend answers 404 on
  /api/admin/auth/login unless the request carries X-Admin-Access-Key;
  that key lives in this server's env and never ships to the browser.
  The middleware gate already ensures only "knocked" browsers can load
  the admin login page that calls this route.
*/

function backendUrl() {
  return (
    process.env.BACKEND_INTERNAL_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8080/api"
      : "http://backend:8080/api")
  ).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const accessKey = process.env.ADMIN_ACCESS_KEY;
  // The knock-gate cookie (set httpOnly by the proxy when the admin URL is
  // visited with the right access key) is required here too — without this
  // check anyone could POST credentials straight through this route and
  // use the server's secret header, defeating the 404 cloak entirely.
  if (req.cookies.get("gh_admin_gate")?.value !== "1") {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 },
    );
  }
  if (!accessKey) {
    return NextResponse.json(
      { success: false, message: "Admin access is not configured on this server." },
      { status: 404 },
    );
  }

  try {
    const body = await req.text();
    const res = await fetch(`${backendUrl()}/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Access-Key": accessKey,
      },
      body,
    });
    const payload = await res.text();
    const next = new NextResponse(payload, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
    // Forward the backend's admin-gate cookie (set on successful ADMIN
    // logins) so the browser can actually enter /admin afterwards.
    for (const cookie of res.headers.getSetCookie?.() ?? []) {
      next.headers.append("Set-Cookie", cookie);
    }
    return next;
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not reach the admin service." },
      { status: 502 },
    );
  }
}
