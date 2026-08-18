import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getServicePage,
  servicePages,
  SITE_URL,
  type ServicePage,
} from "@/lib/seo/services";

/*!
  SEO landing pages — renders the service entries from lib/seo/services.ts
  at their own root URL (/gym-consulting, /gym-marketing, …). Any other
  single-segment path falls through to the standard 404.
*/

export function generateStaticParams() {
  return servicePages.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: `${SITE_URL}/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url: `${SITE_URL}/${page.slug}`,
      type: "website",
    },
  };
}

function ServiceJsonLd({ page }: { page: ServicePage }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    description: page.metaDescription,
    provider: {
      "@type": "Organization",
      name: "Gymholic",
      url: SITE_URL,
    },
    areaServed: ["EG", "AE", "SA", "QA", "KW", "OM", "BH"],
    url: `${SITE_URL}/${page.slug}`,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Gym consulting services",
      itemListElement: servicePages.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.h1, url: `${SITE_URL}/${s.slug}` },
      })),
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}

export default async function ServiceLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-void text-paper">
      <ServiceJsonLd page={page} />

      {/* Hero */}
      <section className="px-6 md:px-10 pt-28 pb-16 max-w-4xl mx-auto">
        <p className="text-orange text-sm font-semibold uppercase tracking-widest mb-4">
          {page.eyebrow}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
          {page.h1}
        </h1>
        {page.intro.map((p, i) => (
          <p key={i} className="text-paper/70 text-lg leading-relaxed mb-4">
            {p}
          </p>
        ))}
        <div className="mt-8 flex flex-wrap gap-4 items-center">
          <Link
            href="/book"
            className="bg-orange text-void font-semibold px-8 py-3 rounded-full hover:bg-orange/90 transition-colors"
          >
            Book a 45-min strategy call
          </Link>
          <span className="text-paper/50 text-sm">From $125 · remote or in-person</span>
        </div>
      </section>

      {/* Who this is for + deliverables */}
      <section className="px-6 md:px-10 py-16 border-t border-paper/10">
        <div className="max-w-4xl mx-auto grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-4">Who this is for</h2>
            <p className="text-paper/80 leading-relaxed">{page.whoFor}</p>
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-4">What you get</h2>
            <ul className="space-y-2.5">
              {page.deliverables.map((d) => (
                <li key={d} className="flex gap-3 text-paper/80">
                  <span className="text-orange shrink-0">→</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Body sections */}
      <section className="px-6 md:px-10 py-16 border-t border-paper/10">
        <div className="max-w-3xl mx-auto space-y-14">
          {page.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
              {section.body.map((p, i) => (
                <p key={i} className="text-paper/70 leading-relaxed mb-4">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="px-6 md:px-10 py-16 border-t border-paper/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8">Frequently asked questions</h2>
          <div className="space-y-6">
            {page.faqs.map((faq) => (
              <div key={faq.q} className="bg-surface border border-paper/10 rounded-xl p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-paper/70 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related + CTA */}
      <section className="px-6 md:px-10 py-16 border-t border-paper/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm uppercase tracking-wider text-paper/50 mb-6">Related services</h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-14">
            {page.related.map((slug) => {
              const rel = getServicePage(slug);
              if (!rel) return null;
              return (
                <Link
                  key={slug}
                  href={`/${slug}`}
                  className="bg-surface border border-paper/10 rounded-xl p-6 hover:border-orange/50 transition-colors"
                >
                  <p className="text-orange text-xs uppercase tracking-wider mb-2">{rel.eyebrow}</p>
                  <p className="font-medium">{rel.h1}</p>
                </Link>
              );
            })}
          </div>

          <div className="bg-surface border border-orange/30 rounded-2xl p-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to work on your gym?
            </h2>
            <p className="text-paper/70 mb-8 max-w-xl mx-auto">
              One 45-minute session. Real numbers, real constraints, a prioritised
              action list — and an honest read on whether we can help you further.
            </p>
            <Link
              href="/book"
              className="inline-block bg-orange text-void font-semibold px-10 py-3.5 rounded-full hover:bg-orange/90 transition-colors"
            >
              Book your strategy call
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
