/*!
  GymHolic Admin Products — coming soon. Courses, downloadable PDFs and
  physical products will be managed here (catalog, pricing, inventory).
*/

"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";

const PRODUCT_CATEGORIES = [
  {
    title: "Courses",
    icon: "🎓",
    description: "Video courses and guided programs. Buyers get instant access after checkout, with progress tracked on their account.",
    tag: "Digital",
  },
  {
    title: "PDF Guides & Playbooks",
    icon: "📄",
    description: "Downloadable blueprints, templates and playbooks — delivered instantly by email and from the customer's payment history.",
    tag: "Digital",
  },
  {
    title: "Physical Products",
    icon: "📦",
    description: "Equipment, merch and print editions with shipping details and inventory tracking.",
    tag: "Physical",
  },
];

export default function AdminProductsPage() {
  return (
    <AdminShell activeHref="/admin/products">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <span className="text-xs uppercase tracking-wider bg-paper/10 text-paper/60 px-3 py-1.5 rounded-full">
          Coming Soon
        </span>
      </div>
      <p className="text-paper/60 text-sm mb-8 max-w-2xl">
        A full product catalogue for the Academy and Blueprints store. Once
        live, you&apos;ll create products here and they&apos;ll appear on the
        website, in the cart and in each customer&apos;s payment history.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {PRODUCT_CATEGORIES.map((category) => (
          <div key={category.title} className="bg-surface border border-dashed border-paper/15 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{category.icon}</span>
              <span className="text-[10px] uppercase tracking-wider bg-paper/10 text-paper/60 px-2 py-1 rounded-full">
                {category.tag}
              </span>
            </div>
            <h2 className="font-semibold mb-2">{category.title}</h2>
            <p className="text-sm text-paper/60 leading-relaxed">{category.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-paper/10 rounded-xl p-6">
        <h2 className="font-semibold mb-4 text-sm">What&apos;s already wired for launch</h2>
        <ul className="text-sm text-paper/60 space-y-2">
          <li>✓ Cart &amp; checkout pipeline (cart items, orders, order items — all in USD)</li>
          <li>✓ Customer payment history on the account page lists product orders automatically</li>
          <li>✓ Order confirmation emails to the customer and the admin inbox</li>
          <li>✓ Payment gateway —{" "}
            <Link href="/admin/integrations" className="underline hover:no-underline text-paper/90">
              connect Paymob under Integrations
            </Link>{" "}
            to take real card payments at launch
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
