"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlueprintCover } from "@/components/blueprints/BlueprintCover";
import { getCatalogProduct } from "@/lib/catalog";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";
import { buildBackendApiUrl, getFrontendApiPath } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { IconPdf, IconGraduationCap } from "@/components/account/icons";

type Order = {
  id: string;
  email?: string;
  status?: string;
  items: { id: string; name: string; price: number; kind: "ACADEMY" | "PRODUCT" }[];
  total: number;
  createdAt?: string;
};

/** Numeric ids are real backend orders; "GH-…" ids are guest (KV) orders. */
function isBackendOrderId(id: string) {
  return /^\d+$/.test(id);
}

async function loadOrder(orderId: string): Promise<Order | null> {
  if (isBackendOrderId(orderId)) {
    const token = getStoredAuthToken();
    if (!token) return null;
    const res = await fetch(buildBackendApiUrl(`orders/${orderId}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return null;
    const d = payload.data;
    return {
      id: `#${d.id}`,
      status: d.status,
      createdAt: d.createdAt,
      items: (d.items ?? []).map((i: { productId: string; title: string; unitPrice: number; productType: string }) => ({
        id: i.productId,
        name: i.title,
        price: i.unitPrice,
        kind: i.productType === "ACADEMY" ? ("ACADEMY" as const) : ("PRODUCT" as const),
      })),
      total: d.total,
    };
  }

  const res = await fetch(getFrontendApiPath(`/orders/${orderId}`));
  if (!res.ok) return null;
  const data = await res.json();
  return {
    ...data,
    items: (data.items ?? []).map((i: { id: string; name: string; price: number; resourceType?: string }) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      kind: i.resourceType === "Academy Membership" ? ("ACADEMY" as const) : ("PRODUCT" as const),
    })),
  };
}

function OrderSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(() => Boolean(orderId));

  useEffect(() => {
    if (!orderId) return;
    loadOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  // The messaging adapts to what was actually bought: a membership unlocks
  // the Academy, a Blueprint unlocks the secure viewer. Nothing here is
  // downloadable by design.
  const membership = order?.items.find((i) => i.kind === "ACADEMY") ?? null;
  const firstBlueprint = order?.items.find((i) => i.kind === "PRODUCT") ?? null;

  const headline = membership
    ? "You're On The Inside."
    : "Your Blueprint Is Ready.";
  const subline = membership
    ? "Your Academy Early Access is secured — you're a founding member now."
    : "It's unlocked in your account, ready to open in the secure viewer.";

  return (
    <section className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24 text-center">
      <div
        className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
        style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)" }}
        aria-hidden
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M4 12.5L9.5 18L20 6.5" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
        {membership ? "Membership Active" : "Order Complete"}
      </p>
      <h1 className="display-hero text-4xl md:text-6xl mb-4">{headline}</h1>
      <p className="opacity-70 max-w-md mx-auto mb-14">{subline}</p>

      <div className="max-w-lg mx-auto rounded-2xl p-8 text-left" style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}>
        {loading ? (
          <p className="opacity-50 text-center">Loading your order…</p>
        ) : !order ? (
          <p className="opacity-50 text-center">
            {orderId
              ? "We couldn't find that order — if storage isn't configured yet, orders aren't being saved."
              : "No order reference provided."}
          </p>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {order.items.map((item) => {
                const product = getCatalogProduct(item.id);
                return (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-14 h-14 shrink-0">
                      {product?.coverLines ? (
                        <BlueprintCover lines={product.coverLines} size="mini" />
                      ) : (
                        <div
                          className="w-full h-full rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(255,106,0,0.12)", border: "1px solid rgba(255,106,0,0.25)", color: "var(--orange)" }}
                          aria-hidden
                        >
                          {item.kind === "ACADEMY" ? <IconGraduationCap width={24} height={24} /> : <IconPdf width={24} height={24} />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs opacity-50">
                        {item.kind === "ACADEMY" ? "Academy Membership · Early Access" : "Blueprint · view in Gymholic"}
                      </p>
                    </div>
                    <span className="text-sm">${item.price}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 mb-2 text-sm space-y-1" style={{ borderTop: "1px solid rgba(245,241,232,0.1)" }}>
              <div className="flex justify-between opacity-70">
                <span>Order Number</span>
                <span>{order.id}</span>
              </div>
              {order.email && (
                <div className="flex justify-between opacity-70">
                  <span>Email</span>
                  <span>{order.email}</span>
                </div>
              )}
              {order.status && (
                <div className="flex justify-between opacity-70">
                  <span>Status</span>
                  <span>{order.status}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Total (USD)</span>
                <span>${order.total}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 mt-10">
        <div className="flex flex-wrap gap-4 justify-center">
          {membership ? (
            <>
              <Link href="/account?tab=membership" className="btn-pill">
                View My Membership
              </Link>
              <Link href="/academy" className="btn-pill btn-pill--ghost">
                Back to Academy
              </Link>
            </>
          ) : firstBlueprint ? (
            <>
              <Link href={`/blueprints/${firstBlueprint.id}?open=1`} className="btn-pill">
                Open in Viewer
              </Link>
              <Link href="/account?tab=library" className="btn-pill btn-pill--ghost">
                My Library
              </Link>
            </>
          ) : (
            <Link href="/blueprints" className="btn-pill">
              Browse Blueprints
            </Link>
          )}
        </div>
        <p className="text-xs opacity-40 max-w-sm">
          {membership
            ? "We'll email you the moment the Academy library opens — your seat is guaranteed."
            : "Blueprints live in your account and open in the secure viewer — nothing to download, nothing to lose."}
        </p>
      </div>
    </section>
  );
}

export default function OrderSuccessPage() {
  useLenis();
  return (
    <>
      <ScrollRefresher />
      <Header />
      <main>
        <Suspense fallback={null}>
          <OrderSuccessContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
