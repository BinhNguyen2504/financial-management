import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLandingMetadata,
  getSeoConfig,
  getWebsiteJsonLd,
  landingDescription,
  landingTitle,
} from "../src/lib/seo";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";

const origin = "https://financial-manager.example.com";
const production = {
  APP_ORIGIN: origin,
  SEO_INDEXABLE: "true",
  NODE_ENV: "production",
};

afterEach(() => vi.unstubAllEnvs());

describe("public SEO configuration", () => {
  it("defaults to noindex without a public canonical or structured data", () => {
    const config = getSeoConfig({});
    expect(config.indexable).toBe(false);
    expect(getLandingMetadata(config).alternates).toBeUndefined();
    expect(getLandingMetadata(config).openGraph).not.toHaveProperty("url");
    expect(getWebsiteJsonLd(config)).toBeUndefined();
  });

  it.each([
    [undefined, "production", undefined, false],
    ["false", "production", "production", false],
    ["true", "development", "production", false],
    ["true", "production", "preview", false],
    ["true", "production", "development", false],
    ["true", "production", "production", true],
    ["true", "production", undefined, true],
  ])("gates flag=%s node=%s vercel=%s", (flag, node, vercel, expected) => {
    expect(
      getSeoConfig({
        APP_ORIGIN: origin,
        SEO_INDEXABLE: flag,
        NODE_ENV: node,
        VERCEL_ENV: vercel,
      }).indexable,
    ).toBe(expected);
  });

  it.each([
    "",
    "not-a-url",
    "https://.",
    "https://finance..com",
    "https://-finance.com",
    "http://finance.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://192.168.1.2",
    "https://finance.local",
    "https://finance.test",
    "https://finance.invalid",
    "https://finance.example",
    "https://user:password@finance.example.com",
    `${origin}/app`,
    `${origin}/?utm_source=test`,
    `${origin}/#preview`,
  ])("rejects invalid public origins when opting in: %s", (APP_ORIGIN) => {
    expect(() => getSeoConfig({ ...production, APP_ORIGIN })).toThrow(
      "SEO_INDEXABLE=true requires APP_ORIGIN",
    );
    expect(getSeoConfig({ APP_ORIGIN }).origin).toBeUndefined();
  });

  it("keeps local metadata images usable without advertising localhost as canonical", () => {
    const config = getSeoConfig({ APP_ORIGIN: "http://127.0.0.1:3456" });
    expect(config.metadataBase).toBe("http://127.0.0.1:3456");
    expect(config.origin).toBeUndefined();
    expect(config.indexable).toBe(false);
  });

  it("uses one normalized origin for canonical, sharing and WebSite JSON-LD", () => {
    const config = getSeoConfig({ ...production, APP_ORIGIN: `${origin}/` });
    const metadata = getLandingMetadata(config);
    expect(metadata.title).toEqual({ absolute: landingTitle });
    expect(metadata.description).toBe(landingDescription);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates).toEqual({ canonical: `${origin}/` });
    expect(metadata.openGraph).toMatchObject({
      url: `${origin}/`,
      locale: "vi_VN",
    });
    expect(JSON.parse(getWebsiteJsonLd(config)!)).toMatchObject({
      "@type": "WebSite",
      name: "Financial Manager",
      url: `${origin}/`,
      inLanguage: "vi-VN",
    });
  });
});

describe("crawler discovery routes", () => {
  it.each([false, true])(
    "only advertises the public home when indexable=%s",
    (enabled) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("APP_ORIGIN", origin);
      vi.stubEnv("SEO_INDEXABLE", String(enabled));
      vi.stubEnv("VERCEL_ENV", "production");
      expect(sitemap()).toEqual(enabled ? [{ url: `${origin}/` }] : []);
      expect(robots()).toEqual({
        rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
        ...(enabled && { sitemap: `${origin}/sitemap.xml` }),
      });
    },
  );
});
