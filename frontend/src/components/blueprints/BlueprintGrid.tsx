"use client";

import { useState } from "react";
import type { Blueprint } from "@/lib/blueprints";
import { BlueprintCover } from "./BlueprintCover";
import { useCart } from "@/components/cart/CartContext";

function BlueprintCard({ blueprint, index }: { blueprint: Blueprint; index: number }) {
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = isInCart(blueprint.id);

  const handleAdd = () => {
    addItem(blueprint.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className="blueprint-card group">
      <BlueprintCover lines={blueprint.coverLines} index={index} />

      <p className="text-xs uppercase tracking-widest mt-4 mb-1" style={{ color: "var(--orange)" }}>
        {blueprint.category}
      </p>
      <h3 className="display-text text-lg mb-1">{blueprint.name}</h3>
      <p className="text-sm opacity-60 mb-2">{blueprint.description}</p>
      <p className="text-xs opacity-40 mb-4">{blueprint.resourceType}</p>

      <div className="flex items-center justify-between">
        <span className="display-text text-xl" style={{ color: "var(--orange)" }}>
          ${blueprint.price}
        </span>
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

export function BlueprintGrid({ blueprints }: { blueprints: Blueprint[] }) {
  if (blueprints.length === 0) {
    return <p className="px-6 md:px-10 opacity-50">No Blueprints in this category yet.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 px-6 md:px-10">
      {blueprints.map((bp, i) => (
        <BlueprintCard key={bp.id} blueprint={bp} index={i} />
      ))}
    </div>
  );
}
