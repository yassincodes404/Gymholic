"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlueprintCover } from "@/components/blueprints/BlueprintCover";
import { getBlueprint } from "@/lib/blueprints";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";

type Order = {
  id: string;
  customer: { email: string; fullName: string };
  items: { id: string; name: string; price: number; resourceType: string }[];
  total: number;
};

function OrderSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDownloadNote, setShowDownloadNote] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${orderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrder)
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
                const bp = getBlueprint(item.id);
                return (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-14 h-14 shrink-0">
                      {bp && <BlueprintCover lines={bp.coverLines} size="mini" />}
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
              <div className="flex justify-between opacity-70">
                <span>Email</span>
                <span>{order.customer.email}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
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
          <a href="/blueprints" className="btn-pill btn-pill--ghost">
            Back to Blueprints
          </a>
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
