"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { CartButton } from "@/components/cart/CartButton";
import { AUTH_CHANGED_EVENT, getStoredUser, logout, type AuthUser } from "@/lib/auth";
import { IconMenu, IconClose, IconLogout, IconUser } from "@/components/account/icons";

const NAV_LINKS = [
  { label: "Method", href: "/#method" },
  { label: "Services", href: "/#services" },
  { label: "Results", href: "/#results" },
  { label: "Academy", href: "/academy" },
  { label: "Blueprints", href: "/blueprints" },
  { label: "FAQ", href: "/#faq" },
];

/**
 * Fixed minimal header, shared across every page. Black is the background
 * everywhere on this site now, so text stays cream at all times — no
 * per-section theme swap needed. Homepage-section links are prefixed with
 * "/" (not bare "#...") so they still resolve correctly from other routes
 * like /academy, not just from the homepage itself.
 *
 * Auth-aware: the right side swaps between "Sign In" and the user's
 * account link + sign-out based on the persisted session (localStorage),
 * and reacts to login/logout anywhere in the app via AUTH_CHANGED_EVENT.
 *
 * Below lg the nav links collapse into a slide-in drawer (they used to
 * disappear entirely on mobile — there was no way to reach Blueprints
 * or FAQ without editing the URL).
 */
export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Mounted after hydration — reading localStorage here is SSR-safe.
    setUser(getStoredUser());
    const sync = () => {
      setUser(getStoredUser());
      setMenuOpen(false);
    };
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <header
        className="header-material fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4"
        style={{ color: "var(--paper)" }}
      >
        <Link href="/" className="flex items-center shrink-0" aria-label="Gymholic — home">
          {/* The logo file carries the full mark + wordmark; no text next to it
              (it collided with the nav links at md widths). */}
          <img src="/gymholic-logo.png" alt="Gymholic" className="h-14 w-auto" />
        </Link>
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm whitespace-nowrap">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="opacity-80 hover:opacity-100 transition-opacity">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3 min-w-0">
          <CartButton />
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100 transition-opacity"
              >
                <span
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/10 text-xs font-semibold overflow-hidden"
                  aria-hidden
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user.firstName || user.email).slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="hidden xl:inline max-w-[120px] truncate">
                  {user.firstName || user.email}
                </span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-[#111] py-1 text-sm shadow-xl"
                  style={{ color: "var(--paper)" }}
                >
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className="block px-4 py-2 hover:bg-white/5">
                      Admin Dashboard
                    </Link>
                  )}
                  <Link href="/account" className="block px-4 py-2 hover:bg-white/5">
                    My Account
                  </Link>
                  <Link href="/book" className="block px-4 py-2 hover:bg-white/5">
                    Book a Call
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-white/5"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden sm:inline text-sm opacity-80 hover:opacity-100 transition-opacity">
              Sign In
            </Link>
          )}
          <MagneticButton href="/book" className="btn-pill text-sm !py-2.5 !px-5 whitespace-nowrap shrink-0">
            <span className="hidden sm:inline">Book a Call</span>
            <span className="sm:hidden">Book</span>
          </MagneticButton>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-white/15 hover:border-white/40 transition-colors"
          >
            <IconMenu width={20} height={20} />
          </button>
        </div>
      </header>

      {/* ---- Mobile navigation drawer ---- */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={`absolute right-0 top-0 bottom-0 w-[84vw] max-w-sm flex flex-col px-7 pt-7 pb-9 overflow-y-auto transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ background: "#0c0c0c", borderLeft: "1px solid rgba(245,241,232,0.12)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--orange)" }}>
              Menu
            </p>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation menu"
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/15 hover:border-white/40 transition-colors"
            >
              <IconClose width={18} height={18} />
            </button>
          </div>

          <nav className="flex flex-col">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeDrawer}
                className="display-text text-2xl py-3.5 opacity-90 hover:opacity-100 hover:text-[var(--orange)] transition-colors"
                style={{
                  borderBottom: i < NAV_LINKS.length - 1 ? "1px solid rgba(245,241,232,0.08)" : undefined,
                  transitionDelay: drawerOpen ? `${i * 40}ms` : undefined,
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto pt-10 flex flex-col gap-3">
            {user ? (
              <Link href="/account" onClick={closeDrawer} className="flex items-center gap-3 px-1 py-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 text-xs font-semibold overflow-hidden" aria-hidden>
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user.firstName || user.email).slice(0, 1).toUpperCase()
                  )}
                </span>
                {user.firstName || user.email}
                <IconUser width={15} height={15} className="ml-auto opacity-60" />
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" onClick={closeDrawer} className="btn-pill btn-pill--ghost w-full justify-center !py-3 text-sm">
                  Sign In
                </Link>
                <Link href="/register" onClick={closeDrawer} className="w-full justify-center text-sm font-semibold !py-3 rounded-full border border-white/15 flex">
                  Register
                </Link>
              </div>
            )}
            {user && (
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  logout();
                  router.push("/");
                }}
                className="flex items-center gap-2 px-1 py-2 text-sm text-paper/60 hover:text-red-400 transition-colors text-left"
              >
                <IconLogout width={16} height={16} />
                Sign out
              </button>
            )}
            <MagneticButton href="/book" className="btn-pill w-full justify-center !py-3.5">
              Book a Call
            </MagneticButton>
          </div>
        </aside>
      </div>
    </>
  );
}
