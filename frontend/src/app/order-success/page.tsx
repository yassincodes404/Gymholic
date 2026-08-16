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

type Order = {
  id: string;
  email?: string;
  status?: string;
  items: { id: string; name: string; price: number; resourceType: string }[];
  total: number;
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
      items: (d.items ?? []).map((i: { productId: string; title: string; unitPrice: number; productType: string }) => ({
        id: i.productId,
        name: i.title,
        price: i.unitPrice,
        resourceType: i.productType === "ACADEMY" ? "Academy Membership" : "Digital Product",
      })),
      total: d.total,
    };
  }

  const res = await fetch(getFrontendApiPath(`/orders/${orderId}`));
  if (!res.ok) return null;
  return res.json();
}

function OrderSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(() => Boolean(orderId));
  const [showDownloadNote, setShowDownloadNote] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    loadOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <section className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24 text-center">
      <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
        Order Complete
      </p>
      <h1 className="display-hero text-4xl md:text-6xl mb-4">Your Blueprint Is Ready.</h1>
      <p className="opacity-70 max-w-md mx-auto mb-14">Your Gymholic resources are ready to access.</p>

      <div className="max-w-lg mx-auto rounded-2xl p-8 text-left" style={{ background: "var(--surface)" }}>
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
                          className="w-full h-full rounded-lg flex items-center justify-center text-xl"
                          style={{ background: "rgba(255,106,0,0.12)", border: "1px solid rgba(255,106,0,0.25)" }}
                          aria-hidden
                        >
                          🎓
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs opacity-50">{item.resourceType}</p>
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
          <button type="button" onClick={() => setShowDownloadNote(true)} className="btn-pill">
            Download Files
          </button>
          <Link href="/blueprints" className="btn-pill btn-pill--ghost">
            Back to Blueprints
          </Link>
        </div>
        {showDownloadNote && (
          <p className="text-sm opacity-50 max-w-sm">
            Your files will be available here once product PDFs are uploaded to the store — for now, check your
            email for your receipt.
          </p>
        )}
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
