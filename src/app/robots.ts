import type { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const { origin, indexable } = getSeoConfig();
  return {
    // Crawlers must be able to read noindex on public/login HTML.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
    ...(indexable && { sitemap: `${origin}/sitemap.xml` }),
  };
}
