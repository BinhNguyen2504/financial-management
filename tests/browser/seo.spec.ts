import { test, expect } from "@playwright/test";

const origin = process.env.TEST_SEO_ORIGIN;
const enabled = process.env.TEST_SEO_INDEXABLE === "true";
const title = "Quản lý tài chính cá nhân | Financial Manager";

test("landing exposes SEO in server HTML for visitors and crawlers", async ({
  browser,
  request,
}) => {
  for (const userAgent of ["Mozilla/5.0", "Googlebot", "Twitterbot"]) {
    const response = await request.get("/?utm_source=seo-check", {
      headers: { "user-agent": userAgent },
    });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(
      "Financial Manager giúp bạn quản lý tài chính cá nhân",
    );
    expect(html).toContain(
      `name="robots" content="${enabled ? "index, follow" : "noindex, nofollow"}"`,
    );
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: process.env.TEST_BASE_URL,
  });
  try {
    const page = await context.newPage();
    await page.goto("/?utm_source=seo-check");
    await expect(page).toHaveTitle(title);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("Làm chủ tiền bạc.");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Quản lý tài chính cá nhân với Financial Manager/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "vi_VN",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    if (origin) {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      // Next normalizes the root URL without its optional trailing slash.
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(new URL(canonical!).href).toBe(`${origin}/`);
      const ogUrl = await page
        .locator('meta[property="og:url"]')
        .getAttribute("content");
      expect(new URL(ogUrl!).href).toBe(`${origin}/`);
      const jsonLd = await page
        .locator('script[type="application/ld+json"]')
        .textContent();
      expect(JSON.parse(jsonLd!)).toMatchObject({
        "@type": "WebSite",
        name: "Financial Manager",
        url: `${origin}/`,
        inLanguage: "vi-VN",
      });
    } else {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      await expect(
        page.locator('script[type="application/ld+json"]'),
      ).toHaveCount(0);
    }
    for (const selector of [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
    ]) {
      const image = new URL(
        (await page.locator(selector).getAttribute("content"))!,
      );
      if (origin) expect(image.origin).toBe(origin);
      const response = await request.get(image.pathname + image.search);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
      const data = await response.body();
      expect(data.readUInt32BE(16)).toBe(1200);
      expect(data.readUInt32BE(20)).toBe(630);
    }
  } finally {
    await context.close();
  }
});

test("English cookie localizes server metadata without changing crawler discovery", async ({
  browser,
  request,
}) => {
  for (const userAgent of ["Mozilla/5.0", "Googlebot", "Twitterbot"]) {
    const response = await request.get("/", {
      headers: { "user-agent": userAgent, cookie: "fm-locale=en" },
    });
    const html = await response.text();
    expect(response.status()).toBe(200);
    expect(html).toContain("Personal finance management | Financial Manager");
    expect(html).toContain("Take charge of your money.");
    expect(html).toContain('lang="en"');
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: process.env.TEST_BASE_URL,
  });
  try {
    await context.addCookies([
      { name: "fm-locale", value: "en", url: process.env.TEST_BASE_URL! },
    ]);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      enabled ? "index, follow" : "noindex, nofollow",
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "en_GB",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /^Manage your personal finances/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(
      0,
    );
    if (origin) {
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(new URL(canonical!).href).toBe(`${origin}/`);
      const jsonLd = await page
        .locator('script[type="application/ld+json"]')
        .textContent();
      expect(JSON.parse(jsonLd!)).toMatchObject({
        inLanguage: "en-GB",
        url: `${origin}/`,
      });
    } else {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      await expect(
        page.locator('script[type="application/ld+json"]'),
      ).toHaveCount(0);
    }
  } finally {
    await context.close();
  }
});

test("crawler endpoints stay public and expose only the opted-in home", async ({
  request,
}) => {
  const response = await request.get("/robots.txt", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  const robots = await response.text();
  expect(robots).toContain("Allow: /");
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toContain("Disallow: /auth/");
  expect(robots).not.toMatch(/Disallow: \/(?:login|_next)/);
  const sitemap = await request.get("/sitemap.xml", { maxRedirects: 0 });
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  if (enabled) {
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(xml.match(/<loc>/g)).toHaveLength(1);
    expect(xml).toContain(`<loc>${origin}/</loc>`);
  } else {
    expect(robots).not.toContain("Sitemap:");
    expect(xml).not.toContain("<loc>");
  }
});

test("guest copy stays readable on narrow screens without financial API access", async ({
  page,
}, testInfo) => {
  const financial: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) financial.push(request.url());
  });
  await page.goto("/");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".marketing-lead")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".marketing-lead, #marketing-features-title")
        .evaluateAll((elements) =>
          elements.every((el) => el.scrollWidth <= el.clientWidth + 1),
        ),
    ).toBe(true);
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath(`seo-${width}.png`),
        fullPage: true,
      });
  }
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("28.500.000 ₫");
  expect(financial).toEqual([]);
});

test("private routes still require login and login remains noindex", async ({
  page,
  request,
}) => {
  const response = await request.get("/overview", { maxRedirects: 0 });
  expect([303, 307]).toContain(response.status());
  expect(response.headers().location).toContain("/login?next=");
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
