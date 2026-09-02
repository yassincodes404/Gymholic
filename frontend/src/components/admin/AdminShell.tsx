/*!
  GymHolic Admin Shell — shared guard + navigation for all admin pages.
  Client-side guard is UX only; authorization is enforced by Spring Security (ADMIN role).
  Desktop: sticky left rail. Mobile: top bar + "Menu" drawer that lists every
  section vertically, so no tab is ever unreachable on a phone. The header
  keeps a "Back to site" link back to the storefront.
*/

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, getStoredAuthToken, logout, type AuthUser } from "@/lib/auth";
import {
  IconGrid,
  IconCalendar,
  IconClock,
  IconNote,
  IconUser,
  IconShield,
  IconCard,
  IconPdf,
  IconSpark,
  IconLogout,
  IconMenu,
  IconClose,
  IconArrowRight,
} from "@/components/account/icons";

const ADMIN_NAV_ITEMS: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Dashboard", href: "/admin", icon: <IconGrid width={16} height={16} /> },
  { label: "Calendar", href: "/admin/calendar", icon: <IconCalendar width={16} height={16} /> },
  { label: "Bookings", href: "/admin/bookings", icon: <IconClock width={16} height={16} /> },
  { label: "Assessments", href: "/admin/assessments", icon: <IconNote width={16} height={16} /> },
  { label: "Customers", href: "/admin/customers", icon: <IconUser width={16} height={16} /> },
  { label: "Whitelist", href: "/admin/whitelist", icon: <IconShield width={16} height={16} /> },
  { label: "Revenue", href: "/admin/revenue", icon: <IconCard width={16} height={16} /> },
  { label: "Products", href: "/admin/products", icon: <IconPdf width={16} height={16} /> },
  { label: "Availability", href: "/admin/availability", icon: <IconCalendar width={16} height={16} /> },
  { label: "Integrations", href: "/admin/integrations", icon: <IconSpark width={16} height={16} /> },
  { label: "Settings", href: "/admin/settings", icon: <IconShield width={16} height={16} /> },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Lock page scroll while the drawer is up; Esc closes it.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  if (checking) {
    return (
      <main className="min-h-screen bg-void text-paper flex items-center justify-center">
        <p className="text-paper/60">Loading admin…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void text-paper">
      {/* Top bar */}
      <header className="border-b border-paper/10 bg-surface/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden admin-icon-btn shrink-0"
            >
              <IconMenu width={18} height={18} />
            </button>
            <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">
              GymHolic <span className="text-orange">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm min-w-0">
            <Link
              href="/"
              className="admin-btn admin-btn-ghost !px-3 !py-1.5 !text-xs shrink-0"
            >
              <span className="hidden sm:inline">Back to site</span>
              <span className="sm:hidden">Site</span>
              <IconArrowRight width={13} height={13} />
            </Link>
            <span className="hidden md:inline text-paper/60 truncate">
              {user ? `${user.firstName} ${user.lastName}` : "Admin"}
            </span>
            {user?.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            )}
            <button
              onClick={() => { logout(); router.push("/admin/login"); }}
              className="admin-icon-btn"
              aria-label="Sign out"
              title="Sign out"
            >
              <IconLogout width={16} height={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop rail + content; mobile stacks */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex gap-8 items-start">
        <aside className="hidden lg:block w-56 shrink-0 sticky top-[89px]">
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link ${item.href === activeHref ? "admin-nav-link-active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {/* Mobile navigation drawer — every section, one scroll */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className={`absolute right-0 top-0 bottom-0 w-[84vw] max-w-xs flex flex-col px-5 pt-5 pb-8 overflow-y-auto transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ background: "#0c0c0c", borderLeft: "1px solid rgba(245,241,232,0.12)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--orange)" }}>
              Admin menu
            </p>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15"
            >
              <IconClose width={16} height={16} />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`admin-nav-link ${item.href === activeHref ? "admin-nav-link-active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6">
            <Link href="/" className="admin-btn admin-btn-ghost w-full">
              Back to site
              <IconArrowRight width={14} height={14} />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
