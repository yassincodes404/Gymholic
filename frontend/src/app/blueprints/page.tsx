"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlueprintsHero } from "@/components/blueprints/BlueprintsHero";
import { BlueprintFilters } from "@/components/blueprints/BlueprintFilters";
import { BlueprintGrid } from "@/components/blueprints/BlueprintGrid";
import { blueprints, type BlueprintCategory } from "@/lib/blueprints";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";

export default function BlueprintsPage() {
  useLenis();
  const [category, setCategory] = useState<BlueprintCategory | "All">("All");

  const filtered = useMemo(
    () => (category === "All" ? blueprints : blueprints.filter((b) => b.category === category)),
    [category]
  );

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main>
        <BlueprintsHero />
        <section className="section-dark pb-24">
          <BlueprintFilters active={category} onChange={setCategory} />
          <BlueprintGrid blueprints={filtered} />
        </section>
      </main>
      <Footer />
    </>
  );
}
