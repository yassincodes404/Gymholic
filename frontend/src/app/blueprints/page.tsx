"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlueprintsHero } from "@/components/blueprints/BlueprintsHero";
import { BlueprintFilters } from "@/components/blueprints/BlueprintFilters";
import { BlueprintGrid } from "@/components/blueprints/BlueprintGrid";
import { ensureStoreProductsLoaded, fetchStoreCategories, isStoreFallback, type StoreProduct } from "@/lib/store";
import { FadeUp } from "@/components/motion/FadeUp";

/*!
 * The Blueprint library — real products from GET /api/store/products with
 * category pills from GET /api/store/categories. Falls back to the mock
 * catalogue when the backend is unreachable, so the page never breaks.
 */
export default function BlueprintsPage() {
  const [categories, setCategories] = useState<{ name: string; slug: string }[] | null>(null);
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [active, setActive] = useState<string>("all");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStoreCategories().then((cats) => {
      if (!cancelled) setCategories(cats.map((c) => ({ name: c.name, slug: c.slug })));
    });
    ensureStoreProductsLoaded().then((items) => {
      if (!cancelled) {
        setProducts(items);
        setOffline(isStoreFallback());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!products) return null;
    if (active === "all") return products;
    return products.filter((p) => p.category?.slug === active);
  }, [products, active]);

  return (
    <>
      <Header />
      <main>
        <BlueprintsHero />
        <section className="section-dark pb-24">
          {offline && (
            <div className="mx-6 md:mx-10 mb-8 bg-orange/10 border border-orange/40 text-orange rounded-lg p-4 text-sm">
              Can&apos;t reach the store backend — showing sample Blueprints. Check that the
              backend is running.
            </div>
          )}
          {categories && (
            <BlueprintFilters
              active={active}
              onChange={setActive}
              options={categories.map((c) => ({ label: c.name, value: c.slug }))}
            />
          )}

          {filtered === null ? (
            <FadeUp as="div">
              <p className="px-6 md:px-10 text-sm opacity-50">Loading the library…</p>
            </FadeUp>
          ) : filtered.length === 0 ? (
            <FadeUp as="div">
              <p className="px-6 md:px-10 opacity-50">No Blueprints in this category yet.</p>
            </FadeUp>
          ) : (
            <BlueprintGrid products={filtered} />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
