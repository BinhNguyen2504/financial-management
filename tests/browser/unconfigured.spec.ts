import { test, expect } from "@playwright/test";

test.describe("without Auth configuration", () => {
  test.skip(
    process.env.TEST_AUTH_UNCONFIGURED !== "1",
    "Run with TEST_AUTH_UNCONFIGURED=1 in an isolated build.",
  );

  test("public content, preview, metadata and login setup work without services", async ({
    page,
  }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Một nơi rõ ràng hơn",
    );
    await expect(
      page.getByRole("link", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Tiết kiệm", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText("85.000.000 ₫");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Financial Manager/,
    );
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(image).toBeTruthy();
    const response = await page.request.get(image!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
    await expect(
      page.getByText("Dịch vụ đăng nhập chưa được kết nối.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator(".app-shell")).toHaveCount(0);
    await page.screenshot({ path: `artifacts/landing/login-setup-${info.project.name}.png`, fullPage: true, scale: "css" });
  });

  test("production PWA starts through auth and caches only the neutral offline page", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: process.env.TEST_BASE_URL,
      serviceWorkers: "allow",
    });
    try {
      const page = await context.newPage();
      await page.goto("/");
      const supported = await page.evaluate(() => "serviceWorker" in navigator);
      test.skip(
        !supported,
        "Service workers are unavailable in this browser context.",
      );
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload();
      await page.waitForFunction(
        () => navigator.serviceWorker.controller !== null,
      );
      const cached = await page.evaluate(async () => {
        const entries = await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map(
              (request) => new URL(request.url).pathname,
            ),
          ),
        );
        return entries.flat();
      });
      expect(cached).toEqual(["/offline.html"]);
      const manifest = await (
        await page.request.get("/manifest.webmanifest")
      ).json();
      expect(manifest.start_url).toBe("/overview");
      await page.goto(manifest.start_url);
      await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
      const script = await page.request.get("/sw.js");
      expect(script.headers()["cache-control"]).toContain("no-store");
      await context.setOffline(true);
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Tạm dừng một nhịp." }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
