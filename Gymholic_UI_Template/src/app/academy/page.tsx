"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AcademyHero } from "@/components/academy/AcademyHero";
import { AcademyFeatures } from "@/components/academy/AcademyFeatures";
import { AcademyPreview } from "@/components/academy/AcademyPreview";
import { AcademyMembership } from "@/components/academy/AcademyMembership";
import { AcademyComingSoon } from "@/components/academy/AcademyComingSoon";
import { AcademyWaitlist } from "@/components/academy/AcademyWaitlist";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";

export default function AcademyPage() {
  useLenis();

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main>
        <AcademyHero />
        <AcademyFeatures />
        <AcademyPreview />
        <AcademyMembership />
        <AcademyComingSoon />
        <AcademyWaitlist />
      </main>
      <Footer />
    </>
  );
}
