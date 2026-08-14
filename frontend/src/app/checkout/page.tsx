"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart, useCartItems } from "@/components/cart/CartContext";
import { CheckoutForm, type CustomerInfo } from "@/components/checkout/CheckoutForm";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { useLenis } from "@/components/motion/useLenis";
import { ScrollRefresher } from "@/components/motion/ScrollRefresher";
import { getFrontendApiPath } from "@/lib/api";

export default function CheckoutPage() {
  useLenis();
  const router = useRouter();
  const { itemIds, subtotal, clear } = useCart();
  const items = useCartItems();
  const [customer, setCustomer] = useState<CustomerInfo>({ email: "", fullName: "", country: "", phone: "" });
  const [ready, setReady] = useState(false);
  // Checkout succeeding clears the cart, which would otherwise immediately
  // re-trigger the "cart is empty, bounce to /blueprints" guard below and
  // race the navigation to /order-success. This flag tells that guard to
  // stand down once a purchase has actually gone through.
  const completedRef = useRef(false);

  useEffect(() => {
    // Give the cart a tick to hydrate from localStorage before deciding it's empty.
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && itemIds.length === 0 && !completedRef.current) router.replace("/blueprints");
  }, [ready, itemIds.length, router]);

  const customerValid = customer.email.trim() && customer.fullName.trim() && customer.country.trim();

  async function handlePaymentSuccess() {
    const res = await fetch(getFrontendApiPath("/checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds, customer }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Checkout failed.");
    completedRef.current = true;
    clear();
    router.push(`/order-success?order=${data.orderId}`);
  }

  if (!ready || itemIds.length === 0) return null;

  return (
    <>
      <ScrollRefresher />
      <Header />
      <main className="section-dark min-h-screen px-6 md:px-10 pt-32 pb-24">
        <h1 className="display-hero text-3xl md:text-5xl mb-12">Checkout</h1>
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl">
          <div className="space-y-10">
            <CheckoutForm values={customer} onChange={setCustomer} />
            {customerValid ? (
              <PaymentForm amountLabel={`$${subtotal}`} submitLabel="Pay" onSuccess={handlePaymentSuccess} />
            ) : (
              <p className="text-sm opacity-40">Fill in your details above to continue to payment.</p>
            )}
          </div>
          <OrderSummary items={items} total={subtotal} />
        </div>
      </main>
      <Footer />
    </>
  );
}
