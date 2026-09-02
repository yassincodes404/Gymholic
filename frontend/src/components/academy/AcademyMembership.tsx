"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { academyMembership } from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { useCart } from "@/components/cart/CartContext";
import { getStoredAuthToken } from "@/lib/auth";
import { fetchBookingPricing } from "@/lib/pricing";
import { ACADEMY_MEMBERSHIP_FALLBACK_PRICE } from "@/lib/catalog";

/**
 * One membership, the whole library. The library launches with the waitlist;
 * clients who want in early can pre-purchase now and are guaranteed access
 * (and a permanent seat on the Academy whitelist) the day content arrives.
 */
export function AcademyMembership() {
  const router = useRouter();
  const { addProduct, open, isInCart } = useCart();
  const [price, setPrice] = useState(ACADEMY_MEMBERSHIP_FALLBACK_PRICE);
  const [enabled, setEnabled] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredAuthToken()));
    fetchBookingPricing().then((pricing) => {
      if (!pricing) return;
      if (typeof pricing.academyMembershipPrice === "number" && pricing.academyMembershipPrice > 0) {
        setPrice(pricing.academyMembershipPrice);
      }
      if (typeof pricing.academyPrePurchaseEnabled === "boolean") {
        setEnabled(pricing.academyPrePurchaseEnabled);
      }
    });
  }, []);

  function prePurchase() {
    // Same gate as every paid surface: no account yet → sign in / create
    // one and land right back here to pre-purchase.
    if (!signedIn) {
      router.push("/login?next=/academy");
      return;
    }
    addProduct({
      id: "academy-membership",
      name: "Gymholic Academy Membership — Early Access",
      price,
      currency: "USD",
      productType: "ACADEMY",
      kindLabel: "Academy Membership",
    });
    open();
  }

  return (
    <section className="section-light py-24 px-6 md:px-10">
      <FadeUp as="div">
        <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
          Membership
        </p>
        <h2 className="display-text text-3xl md:text-5xl mb-14 max-w-2xl">
          One membership. The whole library.
        </h2>
      </FadeUp>

      <div
        className="max-w-xl rounded-2xl p-8 md:p-12"
        style={{ background: "var(--surface)", border: "1px solid rgba(255,106,0,0.25)" }}
      >
        <p className="text-sm uppercase tracking-widest mb-2 opacity-60">{academyMembership.name}</p>
        <div className="flex items-baseline gap-2 mb-6">
          <span className="display-hero text-5xl md:text-6xl" style={{ color: "var(--orange)" }}>
            ${price}
          </span>
          <span className="text-lg opacity-60">USD · early access</span>
        </div>
        <p className="opacity-70 mb-8">{academyMembership.description}</p>

        <ul className="space-y-3 mb-10">
          {academyMembership.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-sm">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: "var(--orange)" }} />
              {perk}
            </li>
          ))}
        </ul>

        {enabled ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={prePurchase}
              className="btn-pill w-full justify-center"
              disabled={isInCart("academy-membership")}
            >
              {isInCart("academy-membership")
                ? "Membership in your cart ✓"
                : `Pre-purchase Early Access — $${price}`}
            </button>
            <p className="text-xs opacity-50">
              Pre-purchasing reserves your seat: you&apos;re added to the Academy
              list and get the full library the moment it launches.
            </p>
          </div>
        ) : (
          <MagneticButton href="#waitlist" className="btn-pill">
            Join the Academy
          </MagneticButton>
        )}

        <a href="#waitlist" className="inline-block mt-4 text-xs opacity-50 underline hover:no-underline">
          Not ready yet? Join the free waitlist instead
        </a>
      </div>
    </section>
  );
}
