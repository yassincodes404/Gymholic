"use client";

import { useState } from "react";
import Link from "next/link";
import { coverLinesFromTitle, storeCoverUrl, type StoreProduct } from "@/lib/store";
import { BlueprintCover } from "./BlueprintCover";
import { useCart } from "@/components/cart/CartContext";

function BlueprintCard({ product, index }: { product: StoreProduct; index: number }) {
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = isInCart(product.slug);

  const handleAdd = () => {
    addItem(product.slug);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className="blueprint-card group">
      <Link href={`/blueprints/${product.slug}`} aria-label={`View ${product.title}`}>
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
        {product.isFree ? (
          <span className="display-text text-xl" style={{ color: "var(--orange)" }}>
            Free
          </span>
        ) : (
          <span className="display-text text-xl" style={{ color: "var(--orange)" }}>
            ${product.price}
          </span>
        )}
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
      </div>
    </div>
  );
}

export function BlueprintGrid({ products }: { products: StoreProduct[] }) {
  if (products.length === 0) {
    return <p className="px-6 md:px-10 opacity-50">No Blueprints in this category yet.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 px-6 md:px-10">
      {products.map((product, i) => (
        <BlueprintCard key={product.slug} product={product} index={i} />
      ))}
    </div>
  );
}
