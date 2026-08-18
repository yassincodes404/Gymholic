import type { MetadataRoute } from "next";
import { servicePages, SITE_URL } from "@/lib/seo/services";
import { blogPosts } from "@/lib/seo/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/book`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/blueprints`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/academy`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/register`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const services: MetadataRoute.Sitemap = servicePages.map((s) => ({
    url: `${SITE_URL}/${s.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const blog: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    ...blogPosts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];

  return [...staticRoutes, ...services, ...blog];
}
