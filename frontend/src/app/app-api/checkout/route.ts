import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { sendOrderReceiptEmail } from "@/lib/email";
import { getCatalogProduct } from "@/lib/catalog";

type CheckoutBody = {
  itemIds: string[];
  customer: { email: string; fullName: string; country: string; phone: string };
};

/**
 * Card processing already happened (simulated) client-side before this is
 * called — this route does the real work: persist the order and send a
 * real receipt email. If KV/Resend aren't configured, both no-op with a
 * warning (see src/lib/kv.ts, src/lib/email.ts) rather than failing the
 * request, so the demo flow still completes end-to-end.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutBody;

  if (!body.itemIds?.length || !body.customer?.email) {
    return NextResponse.json({ error: "Missing cart items or customer email." }, { status: 400 });
  }

  const items = body.itemIds
    .map((id) => getCatalogProduct(id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  if (items.length === 0) {
    return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
  }

  const total = items.reduce((sum, i) => sum + i.price, 0);
  const orderId = `GH-${Date.now().toString(36).toUpperCase()}`;

  const order = {
    id: orderId,
    customer: body.customer,
    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, resourceType: i.kindLabel })),
    total,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`order:${orderId}`, order);

  await sendOrderReceiptEmail({
    to: body.customer.email,
    name: body.customer.fullName,
    orderId,
    items: items.map((i) => ({ title: i.name, price: i.price })),
    total,
  });

  return NextResponse.json({ orderId });
}
