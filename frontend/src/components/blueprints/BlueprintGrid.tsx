"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { coverLinesFromTitle, fetchStoreLibrary, storeCoverUrl, type StoreProduct } from "@/lib/store";
import { getStoredAuthToken } from "@/lib/auth";
import { catalogProductFromStore } from "@/lib/catalog";
import { BlueprintCover } from "./BlueprintCover";
import { useCart } from "@/components/cart/CartContext";
import { IconCheck } from "@/components/account/icons";

/*!
 * Blueprint card — the storefront tile. When the signed-in visitor already
 * owns a blueprint (or it's free and accessible from their library) the
 * cart button becomes an "Owned · Open" action that drops them straight
 * into the secure viewer, so a purchase never offers to be purchased again.
 */
function BlueprintCard({
  product,
  index,
  owned,
}: {
  product: StoreProduct;
  index: number;
  owned: boolean;
}) {
  const { addProduct, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = isInCart(product.slug);

  const handleAdd = () => {
    // The entry carries its own title/price, so checkout works even if this
    // Blueprint was added to the store after the page's catalog was fetched.
    addProduct(catalogProductFromStore(product));
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className="blueprint-card group">
      <Link href={`/blueprints/${product.slug}`} aria-label={`View ${product.title}`}>
        <div className="relative">
          {product.hasCover ? (
            <div
              className="aspect-[3/4] rounded-lg overflow-hidden"
              style={{ border: "1px solid rgba(255,106,0,0.2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storeCoverUrl(product.slug)}
                alt={`${product.title} cover`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <BlueprintCover lines={coverLinesFromTitle(product.title)} index={index} />
          )}
          {owned && (
            <span
              className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: "rgba(10,10,10,0.75)", color: "var(--orange)", border: "1px solid rgba(255,106,0,0.45)" }}
            >
              <IconCheck width={11} height={11} />
              In your library
            </span>
          )}
        </div>
      </Link>

      <p className="text-xs uppercase tracking-widest mt-4 mb-1" style={{ color: "var(--orange)" }}>
        {product.category?.name ?? "Blueprint"}
      </p>
      <Link href={`/blueprints/${product.slug}`} className="block group-hover:text-orange transition-colors">
        <h3 className="display-text text-lg mb-1">{product.title}</h3>
      </Link>
      <p className="text-sm opacity-60 mb-2">{product.shortDescription}</p>
      <p className="text-xs opacity-40 mb-4">PDF Blueprint</p>

      <div className="flex items-center justify-between">
        <span className="display-text text-xl" style={{ color: "var(--orange)" }}>
          {product.isFree ? "Free" : `$${product.price}`}
        </span>
        {owned ? (
          <Link
            href={`/blueprints/${product.slug}?open=1`}
            className="text-xs uppercase tracking-widest px-4 py-2.5 rounded-full inline-flex items-center gap-2"
            style={{
              background: "rgba(255,106,0,0.12)",
              color: "var(--orange)",
              border: "1px solid rgba(255,106,0,0.45)",
            }}
          >
            Owned · Open
            <IconCheck width={12} height={12} aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="blueprint-add-btn text-xs uppercase tracking-widest px-4 py-2.5 rounded-full inline-flex items-center gap-2"
            style={{
              background: justAdded ? "var(--orange)" : "transparent",
              color: justAdded ? "var(--void)" : "var(--paper)",
              border: "1px solid rgba(245,241,232,0.25)",
            }}
          >
            {justAdded ? "Added" : inCart ? "In Cart" : "Add to Cart"}
            <span className="blueprint-add-arrow" aria-hidden="true">
              &rarr;
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function BlueprintGrid({ products }: { products: StoreProduct[] }) {
  // Ownership is resolved once per grid from the signed-in user's library.
  const [ownedSlugs, setOwnedSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setOwnedSlugs(new Set());
      return;
    }
    let cancelled = false;
    fetchStoreLibrary(token).then((library) => {
      if (!cancelled) setOwnedSlugs(new Set((library ?? []).map((i) => i.slug)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (products.length === 0) {
    return <p className="px-6 md:px-10 opacity-50">No Blueprints in this category yet.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 px-6 md:px-10">
      {products.map((product, i) => (
        <BlueprintCard key={product.slug} product={product} index={i} owned={ownedSlugs?.has(product.slug) ?? false} />
      ))}
    </div>
  );
}
