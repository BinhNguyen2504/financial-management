import { isIP } from "node:net";
import type { Metadata } from "next";
import { publicProductSummary } from "@/features/catalog";

type SeoEnvironment = {
  APP_ORIGIN?: string;
  SEO_INDEXABLE?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export const landingTitle = "Quản lý tài chính cá nhân | Financial Manager";
export const landingDescription = publicProductSummary;

export function getSeoConfig(env: SeoEnvironment = process.env) {
  let origin: string | undefined;
  let metadataBase = "http://localhost:3000";
  try {
    const url = new URL(env.APP_ORIGIN ?? "");
    const validOrigin =
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash;
    if (validOrigin) metadataBase = url.origin;
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      validOrigin &&
      url.protocol === "https:" &&
      !isIP(hostname) &&
      hostname.includes(".") &&
      hostname.length <= 253 &&
      hostname
        .split(".")
        .every((label) =>
          /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
        ) &&
      !/(^|\.)(localhost|local|internal|test|invalid|example)\.?$/.test(
        hostname,
      )
    ) {
      origin = url.origin;
    }
  } catch {
    // Development without a public origin still supports local share images.
  }
  if (env.SEO_INDEXABLE === "true" && !origin) {
    throw new Error(
      "SEO_INDEXABLE=true requires APP_ORIGIN to be a public HTTPS origin without credentials, path, query or fragment.",
    );
  }
  return {
    origin,
    metadataBase,
    indexable:
      env.SEO_INDEXABLE === "true" &&
      !!origin &&
      env.NODE_ENV === "production" &&
      (!env.VERCEL_ENV || env.VERCEL_ENV === "production"),
  };
}

export function getLandingMetadata(config = getSeoConfig()): Metadata {
  return {
    title: { absolute: landingTitle },
    description: landingDescription,
    robots: { index: config.indexable, follow: config.indexable },
    ...(config.origin && {
      alternates: { canonical: `${config.origin}/` },
    }),
    openGraph: {
      title: landingTitle,
      description: landingDescription,
      locale: "vi_VN",
      type: "website",
      siteName: "Financial Manager",
      ...(config.origin && { url: `${config.origin}/` }),
    },
    twitter: {
      card: "summary_large_image",
      title: landingTitle,
      description: landingDescription,
      // Next derives the hashed image URL and alt from opengraph-image.tsx.
    },
  };
}

export function getWebsiteJsonLd(config = getSeoConfig()) {
  if (!config.origin) return undefined;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Financial Manager",
    url: `${config.origin}/`,
    inLanguage: "vi-VN",
    description: landingDescription,
  }).replace(/</g, "\\u003c");
}
