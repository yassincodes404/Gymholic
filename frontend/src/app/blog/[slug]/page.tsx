import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/lib/seo/blog";
import { getServicePage, SITE_URL } from "@/lib/seo/services";

/*!
  Blog post pages — rendered from lib/seo/blog.ts with Article metadata
  and JSON-LD. Any unknown slug returns the standard 404.
*/

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Gymholic" }],
    },
  };
}

function ArticleJsonLd({
  post,
}: {
  post: ReturnType<typeof getBlogPost> & object;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: "Gymholic", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Gymholic", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    notFound();
  }

  const relatedService = post.relatedService ? getServicePage(post.relatedService) : undefined;
  const relatedPosts = (post.relatedBlog ?? [])
    .map((s) => getBlogPost(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="min-h-screen bg-void text-paper">
      <ArticleJsonLd post={post} />

      <article className="px-6 md:px-10 pt-28 pb-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 text-xs text-paper/50 mb-4">
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-10">
          {post.title}
        </h1>

        <div className="space-y-10">
          {post.blocks.map((block, i) => (
            <section key={i}>
              {block.heading && (
                <h2 className="text-2xl font-semibold mb-4">{block.heading}</h2>
              )}
              {block.paragraphs?.map((p, j) => (
                <p key={j} className="text-paper/75 leading-relaxed mb-4">
                  {p}
                </p>
              ))}
              {block.bullets && (
                <ul className="space-y-2.5 mt-2">
                  {block.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-paper/75 leading-relaxed">
                      <span className="text-orange shrink-0">→</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-surface border border-orange/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            Want this applied to your gym?
          </h2>
          <p className="text-paper/70 mb-6">
            Book a 45-minute strategy call — real numbers, real constraints, a
            prioritised action list.
          </p>
          <Link
            href="/book"
            className="inline-block bg-orange text-void font-semibold px-8 py-3 rounded-full hover:bg-orange/90 transition-colors"
          >
            Book your strategy call
          </Link>
        </div>

        {/* Related */}
        {(relatedService || relatedPosts.length > 0) && (
          <div className="mt-12">
            <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-5">
              Keep reading
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedService && (
                <Link
                  href={`/${relatedService.slug}`}
                  className="bg-surface border border-paper/10 rounded-xl p-5 hover:border-orange/50 transition-colors"
                >
                  <p className="text-orange text-xs uppercase tracking-wider mb-1.5">
                    Service
                  </p>
                  <p className="font-medium">{relatedService.h1}</p>
                </Link>
              )}
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="bg-surface border border-paper/10 rounded-xl p-5 hover:border-orange/50 transition-colors"
                >
                  <p className="text-orange text-xs uppercase tracking-wider mb-1.5">
                    Guide
                  </p>
                  <p className="font-medium">{rp.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-12 text-center">
          <Link href="/blog" className="text-orange underline hover:no-underline">
            ← All guides
          </Link>
        </p>
      </article>
    </main>
  );
}
