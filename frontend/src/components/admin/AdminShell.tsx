/*!
  GymHolic Admin Shell — shared guard + navigation for all admin pages.
  Client-side guard is UX only; authorization is enforced by Spring Security (ADMIN role).
*/

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, getStoredAuthToken, logout, type AuthUser } from "@/lib/auth";

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Calendar", href: "/admin/calendar" },
  { label: "Bookings", href: "/admin/bookings" },
  { label: "Assessments", href: "/admin/assessments" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Whitelist", href: "/admin/whitelist" },
  { label: "Revenue", href: "/admin/revenue" },
  { label: "Products", href: "/admin/products" },
  { label: "Availability", href: "/admin/availability" },
  { label: "Integrations", href: "/admin/integrations" },
  { label: "Settings", href: "/admin/settings" },
];

export function AdminShell({
  children,
  activeHref,
}: {
  children: ReactNode;
  activeHref: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const current = await fetchCurrentUser(token);
      if (cancelled) return;
      if (!current || current.role !== "ADMIN") {
        logout();
        router.replace("/admin/login");
        return;
      }
      setUser(current);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-void text-paper flex items-center justify-center">
        <p className="text-paper/60">Loading admin…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void text-paper">
      <header className="border-b border-paper/10 bg-surface/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">GymHolic Admin</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-paper/60">
              {user ? `${user.firstName} ${user.lastName}` : "Admin"}
            </span>
            <button onClick={() => { logout(); router.push("/admin/login"); }}
              className="text-paper/75 border border-paper/15 rounded-lg px-3 py-1.5 hover:bg-paper/10 transition-colors">
              Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-6 pb-3 flex gap-1 overflow-x-auto text-sm">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                item.href === activeHref
                  ? "bg-orange-dim text-orange"
                  : "text-paper/60 hover:bg-paper/5 hover:text-paper/90"
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </main>
  );
}
