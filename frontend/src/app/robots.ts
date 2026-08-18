import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/services";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Never let crawlers near auth or the admin area.
        disallow: ["/admin", "/admin/", "/api/", "/app-api/", "/account", "/checkout", "/reschedule", "/order-success", "/reset-password"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
