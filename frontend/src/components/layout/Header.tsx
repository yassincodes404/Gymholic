import Link from "next/link";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { CartButton } from "@/components/cart/CartButton";

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
 */
export function Header() {
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
        <MagneticButton href="/book" className="btn-pill text-sm !py-2.5 !px-5">
          Book a Call
        </MagneticButton>
      </div>
    </header>
  );
}
