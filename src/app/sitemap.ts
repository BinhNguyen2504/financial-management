import type { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const { origin, indexable } = getSeoConfig();
  return indexable ? [{ url: `${origin}/` }] : [];
}
