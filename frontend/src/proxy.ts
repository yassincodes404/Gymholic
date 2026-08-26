import { NextRequest, NextResponse } from "next/server";

/*!
  Admin portal gate — /admin/** returns 404 for everyone except browsers
  that have "knocked" with the secret key:
  https://gymholic.ae/admin/login?key=<ADMIN_ACCESS_KEY>
  The first correct visit sets an httpOnly access cookie; without it (and
  without the key) every admin route is rewritten to a 404 — the portal is
  not discoverable in the page source, sitemap or URL guessing.
  Set ADMIN_ACCESS_KEY on the frontend container (server-side only; never
  NEXT_PUBLIC_). When unset (local dev) the gate stays open.
*/

const GATE_COOKIE = "gh_admin_gate";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const accessKey = process.env.ADMIN_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.next(); // gate disabled (local dev)
  }

  if (req.cookies.get(GATE_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  const provided = req.nextUrl.searchParams.get("key");
  if (provided && timingSafeEqual(provided, accessKey)) {
    // Correct knock — set the access cookie and drop the key from the URL.
    const url = req.nextUrl.clone();
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set(GATE_COOKIE, "1", {
      httpOnly: true,
      // lax (not strict): the cookie must survive cross-site top-level
      // redirects back into /admin — e.g. the Google OAuth callback
      // (accounts.google.com -> gymholic.ae/admin/integrations?google=…).
      // Strict would withhold it there and the gate would 404 the landing.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: "/",
    });
    return res;
  }

  // Everyone else gets an identical 404 — nothing reveals the portal.
  return NextResponse.rewrite(new URL("/admin-gate-404", req.url));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
