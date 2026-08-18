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
    return new NextResponse(payload, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not reach the admin service." },
      { status: 502 },
    );
  }
}
