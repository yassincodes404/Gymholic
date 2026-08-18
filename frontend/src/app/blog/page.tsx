import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/seo/blog";
import { SITE_URL } from "@/lib/seo/services";

export const metadata: Metadata = {
  title: "Gym Business Blog — Guides for Gym Owners & Investors",
  description:
    "Practical, numbers-first guides for gym owners: startup costs, membership growth, equipment buying, management systems and personal training revenue.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const sorted = [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <main className="min-h-screen bg-void text-paper">
      <section className="px-6 md:px-10 pt-28 pb-16 max-w-4xl mx-auto">
        <p className="text-orange text-sm font-semibold uppercase tracking-widest mb-4">
          The Gymholic Blog
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
          Numbers-first guides for gym owners
        </h1>
        <p className="text-paper/70 text-lg leading-relaxed mb-12 max-w-2xl">
          Everything we&apos;ve learned making gyms profitable across Egypt, the UAE
          and the GCC — written as the guides we wish existed when we started.
          No fluff, no recycled listicles.
        </p>

        <div className="space-y-5">
          {sorted.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block bg-surface border border-paper/10 rounded-xl p-7 hover:border-orange/50 transition-colors group"
            >
              <div className="flex items-center gap-3 text-xs text-paper/50 mb-3">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <span>·</span>
                <span>{post.readingMinutes} min read</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2 group-hover:text-orange transition-colors">
                {post.title}
              </h2>
              <p className="text-paper/70 leading-relaxed">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
