"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { CartButton } from "@/components/cart/CartButton";
import { AUTH_CHANGED_EVENT, getStoredUser, logout, type AuthUser } from "@/lib/auth";

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
 */
export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <header
      className="header-material fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4"
      style={{ color: "var(--paper)" }}
    >
      <Link href="/" className="flex items-center gap-2 display-text text-lg font-semibold tracking-tight">
        <img src="/gymholic-logo.png" alt="Gymholic" className="h-14 w-auto" />
        Gymholic
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-sm">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="opacity-80 hover:opacity-100 transition-opacity">
            {link.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <CartButton />
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100 transition-opacity"
            >
              <span
                className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/10 text-xs font-semibold"
                aria-hidden
              >
                {(user.firstName || user.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline max-w-[120px] truncate">
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
          <Link href="/login" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
            Sign In
          </Link>
        )}
        <MagneticButton href="/book" className="btn-pill text-sm !py-2.5 !px-5">
          Book a Call
        </MagneticButton>
      </div>
    </header>
  );
}
