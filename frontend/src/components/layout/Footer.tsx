import Link from "next/link";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { servicePages } from "@/lib/seo/services";
import { blogPosts } from "@/lib/seo/blog";

/** Marquee wordmark footer + the crawlable SEO link sections (services, guides). */
export function Footer() {
  const words = ["GYMHOLIC", "RETENTION", "GYMHOLIC", "STRATEGY", "GYMHOLIC", "GROWTH"];
  const featuredServices = servicePages.slice(0, 6);
  const featuredPosts = blogPosts.slice(0, 4);

  return (
    <footer className="section-dark pt-24 pb-10 overflow-hidden">
      <div className="marquee-row mb-16">
        {[...words, ...words].map((w, i) => (
          <span key={i} className="marquee-wordmark text-[14vw] md:text-[9vw] px-6">
            {w}
          </span>
        ))}
      </div>

      <div className="px-6 md:px-10 grid gap-10 md:grid-cols-3 mb-12">
        <div>
          <p className="text-sm uppercase tracking-wider text-paper/40 mb-4">Services</p>
          <ul className="space-y-2.5">
            {featuredServices.map((s) => (
              <li key={s.slug}>
                <Link href={`/${s.slug}`} className="text-sm text-paper/70 hover:text-orange transition-colors">
                  {s.eyebrow === "Gym Consulting" ? "Gym Consulting" : s.h1.split(":")[0]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm uppercase tracking-wider text-paper/40 mb-4">Guides</p>
          <ul className="space-y-2.5">
            {featuredPosts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="text-sm text-paper/70 hover:text-orange transition-colors">
                  {p.title.split(":")[0]}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/blog" className="text-sm text-orange hover:underline">
                All guides →
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-start md:items-end justify-between gap-6">
          <p className="text-sm opacity-60 max-w-sm">
            Gym business consulting for owners, operators, and investors —
            Egypt, the UAE, the GCC, and worldwide.
          </p>
          <MagneticButton href="/book" className="btn-pill">
            Book a Call
          </MagneticButton>
        </div>
      </div>

      <div className="px-6 md:px-10 mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs opacity-50">
        <span>© {new Date().getFullYear()} Gymholic. All rights reserved.</span>
        <a
          href="https://instagram.com/gymholic"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-orange transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.4" />
            <circle cx="12" cy="12" r="3.6" />
            <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" stroke="none" />
          </svg>
          Instagram
        </a>
        <span>Egypt · UAE · GCC · Worldwide</span>
      </div>
    </footer>
  );
}
