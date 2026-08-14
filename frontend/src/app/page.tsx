"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/hero/Hero";
import { AudienceStrip } from "@/components/audience/AudienceStrip";
import { MethodPath } from "@/components/method/MethodPath";
import { ServiceGrid } from "@/components/services/ServiceGrid";
import { CaseStudyCarousel } from "@/components/case-studies/CaseStudyCarousel";
import { Marquee } from "@/components/differentiators/Marquee";
import { FounderSection } from "@/components/founder/FounderSection";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { BookingBand } from "@/components/cta/BookingBand";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";

export default function Home() {
  useLenis();

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main>
        <Hero />
        <AudienceStrip />
        <MethodPath />
        <ServiceGrid />
        <CaseStudyCarousel />
        <Marquee />
        <FounderSection />
        <FaqAccordion />
        <BookingBand />
      </main>
      <Footer />
    </>
  );
}
