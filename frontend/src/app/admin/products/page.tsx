/*!
  GymHolic Admin Products — coming soon. Courses, downloadable PDFs and
  physical products will be managed here (catalog, pricing, inventory).
*/

"use client";

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
        <span className="text-xs uppercase tracking-wider bg-neutral-800 text-neutral-400 px-3 py-1.5 rounded-full">
          Coming Soon
        </span>
      </div>
      <p className="text-neutral-400 text-sm mb-8 max-w-2xl">
        A full product catalogue for the Academy and Blueprints store. Once
        live, you&apos;ll create products here and they&apos;ll appear on the
        website, in the cart and in each customer&apos;s payment history.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {PRODUCT_CATEGORIES.map((category) => (
          <div key={category.title} className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{category.icon}</span>
              <span className="text-[10px] uppercase tracking-wider bg-neutral-800 text-neutral-400 px-2 py-1 rounded-full">
                {category.tag}
              </span>
            </div>
            <h2 className="font-semibold mb-2">{category.title}</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">{category.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4 text-sm">What&apos;s already wired for launch</h2>
        <ul className="text-sm text-neutral-400 space-y-2">
          <li>✓ Cart &amp; checkout pipeline (cart items, orders, order items — all in USD)</li>
          <li>✓ Customer payment history on the account page lists product orders automatically</li>
          <li>✓ Order confirmation emails to the customer and the admin inbox</li>
          <li>✓ Payment gateway —{" "}
            <a href="/admin/integrations" className="underline hover:no-underline text-neutral-200">
              connect Paymob under Integrations
            </a>{" "}
            to take real card payments at launch
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
