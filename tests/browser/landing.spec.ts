import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { modules } from "../../src/features/catalog";

async function requestCode(page: Page, next = "/overview") {
  const email = `${randomUUID()}@example.test`;
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  const otp = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/auth/v1/otp",
  );
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  const authURL = new URL((await otp).url()).origin;
  await expect(page.getByLabel("Mã xác nhận", { exact: true })).toBeVisible();
  return { email, authURL };
}
async function login(page: Page, next = "/overview") {
  const identity = await requestCode(page, next);
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(new RegExp(`${next}$`));
  return identity;
}

test("public landing and preview stay independent of financial APIs and account data", async ({
  page,
}) => {
  const financial: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) financial.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Làm chủ tiền bạc.",
  );
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar, .topbar")).toHaveCount(0);
  const preview = page.locator(".product-preview");
  await expect(
    preview.getByText("Dữ liệu minh họa", { exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByRole("tab", { name: "Chi tiêu", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await preview.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await expect(preview.getByRole("tabpanel")).toContainText("28.500.000 ₫");
  await preview.getByRole("button", { name: "Ẩn số tiền minh họa" }).click();
  await expect(preview.getByRole("tabpanel")).not.toContainText("28.500.000");
  await expect(preview.getByRole("tabpanel")).toContainText("•••••• ₫");
  await preview.getByRole("tab", { name: "Tiết kiệm", exact: true }).click();
  await expect(preview.getByRole("tabpanel")).not.toContainText("85.000.000");
  await preview.getByRole("button", { name: "Hiện số tiền minh họa" }).click();
  await expect(preview.getByRole("tabpanel")).toContainText("85.000.000 ₫");
  await preview.getByRole("tab", { name: "Chi tiêu", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    preview.getByRole("tab", { name: "Thu nhập", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    preview.getByRole("tab", { name: "Quỹ an toàn", exact: true }),
  ).toBeFocused();
  await expect(preview.getByRole("tabpanel")).toContainText("42.750.000 ₫");
  await expect(page.locator("#dang-phat-trien")).toContainText(
    "chưa có tổng tài sản ròng",
  );
  expect(financial).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("fm-privacy")),
  ).toBeNull();
});

test("every application route requires login, including with a forged bearer header", async ({
  page,
}) => {
  for (const path of [...modules.map((item) => `/${item.slug}`), "/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL(
      new RegExp(`/login\\?next=${encodeURIComponent(path)}$`),
    );
    await expect(
      page.getByRole("heading", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCount(0);
  }
  await page.setExtraHTTPHeaders({ authorization: "Bearer forged" });
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
  const response = await page.request.get("/api/v1/expenses");
  expect(response.status()).toBe(401);
});

test("login returns to the requested page and authenticated users can revisit the landing", async ({
  page,
}) => {
  await login(page, "/savings");
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("[data-landing-audience=member]")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Một nơi rõ ràng hơn",
  );
  await expect(
    page.getByRole("button", { name: "Tài khoản của Bạn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".landing-hero").getByRole("link", { name: "Vào ứng dụng" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tài khoản của Bạn", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Thông tin cá nhân", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profile(?:\?|$)/);
  await page.goto("/login?next=/income");
  await expect(page).toHaveURL(/\/income$/);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tài khoản của Bạn", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-landing-audience=guest]")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Làm chủ tiền bạc",
  );
  await page.goto("/savings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsavings$/);
});

test("new user login defaults to overview and unsafe destinations remain inside the app", async ({
  page,
}) => {
  await requestCode(page, "//evil.test");
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("00000000");
  await expect(page.locator("main [role=alert]")).toContainText(
    "Mã không đúng, đã hết hạn hoặc đã được sử dụng",
  );
  await expect(page.getByLabel("Email", { exact: true })).not.toBeEmpty();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/overview$/);
  await page.goto("/login?next=https://evil.test");
  await expect(page).toHaveURL(/\/overview$/);
});

test("email callback verifies PKCE, preserves destination and handles expired links", async ({
  page,
}) => {
  const { email, authURL } = await requestCode(page, "/savings");
  const result = await page.request.post(`${authURL}/__test__/auth-state`, {
    data: { email },
  });
  const { code } = await result.json();
  await page.goto(`/auth/callback?code=${code}&next=/savings`);
  await expect(page).toHaveURL(/\/savings$/);
  await expect(
    page.getByRole("button", { name: "Tài khoản của Bạn", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tài khoản của Bạn", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/auth/callback?code=expired&next=/income");
  await expect(page).toHaveURL(/\/login\?error=confirmation&next=%2Fincome$/);
  await expect(page.locator("main [role=alert]")).toContainText(
    "Liên kết đăng nhập đã hết hạn",
  );
});

test("Auth outage blocks workspaces without logout, retries, and revoked sessions require login", async ({
  page,
}) => {
  const { email, authURL } = await login(page);
  await page.request.post(`${authURL}/__test__/auth-state`, {
    data: { email, unavailable: true },
  });
  try {
    await page.goto("/income");
    await expect(page).toHaveURL(/\/income$/);
    await expect(
      page.getByRole("heading", { name: "Kết nối đăng nhập đang gián đoạn" }),
    ).toBeVisible();
    await expect(page.locator(".income-workspace")).toHaveCount(0);
    await page.request.post(`${authURL}/__test__/auth-state`, {
      data: { email, unavailable: false },
    });
    await page
      .getByRole("button", { name: "Thử lại kết nối", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Thu nhập", exact: true }),
    ).toBeVisible();
    await page.request.post(`${authURL}/__test__/auth-state`, {
      data: { email, unavailable: true },
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Một nơi rõ ràng hơn",
    );
    await expect(
      page.getByRole("button", { name: "Thử tải thông tin cá nhân" }),
    ).toBeVisible();
  } finally {
    await page.request.post(`${authURL}/__test__/auth-state`, {
      data: { email, unavailable: false },
    });
  }
  await page.getByRole("button", { name: "Thử tải thông tin cá nhân" }).click();
  await expect(
    page.getByRole("button", { name: "Tài khoản của Bạn", exact: true }),
  ).toBeVisible();
  await page.goto("/income");
  await expect(
    page.getByRole("heading", { name: "Thu nhập", exact: true }),
  ).toBeVisible();
  await page.request.post(`${authURL}/__test__/auth-state`, {
    data: { email, revoke: true },
  });
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
});

test("landing supports small phones, tablets, dark mode, zoom and reduced motion", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const clipped = await page
        .locator(
          ".marketing-hero-copy, .marketing-composition, .marketing-feature, .marketing-details > div, .marketing-hero h1, .preview-workspace, .preview-tabs, .preview-metrics",
        )
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const bounds = element.getBoundingClientRect();
              return (
                bounds.left < -1 ||
                bounds.right > innerWidth + 1 ||
                (!element.classList.contains("marketing-composition") &&
                  // Tab strips intentionally scroll within their visible frame.
                  !["auto", "scroll"].includes(
                    getComputedStyle(element).overflowX,
                  ) &&
                  element.scrollWidth > element.clientWidth + 1)
              );
            })
            .map((element) => element.className),
        );
      expect(clipped).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });
  expect(
    await page
      .locator(".marketing-hero")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page.setViewportSize({
    width: info.project.name === "desktop" ? 1440 : 390,
    height: 1000,
  });
  await page.screenshot({
    path: `artifacts/landing/landing-${info.project.name}-dark.png`,
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({
    path: `artifacts/landing/landing-${info.project.name}-light.png`,
    fullPage: true,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/landing/hero-${info.project.name}.png`,
    scale: "css",
  });
  expect(errors).toEqual([]);
});

test("landing remains readable without JavaScript; private routes still redirect", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Làm chủ tiền bạc.",
    );
    await expect(page.locator(".preview-heading")).toContainText(
      "Chăm chút cho tháng",
    );
    await expect(
      page.getByRole("link", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
  } finally {
    await context.close();
  }
});

test("guest branding ignores saved app themes and preserves preferences through login", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("fm-visual-theme", "water");
    localStorage.setItem("fm-theme", "dark");
  });
  await page.goto("/");
  const shell = page.locator(".marketing-shell");
  await expect(shell).toBeVisible();
  for (const visual of ["forest", "water", "gold", "fire"]) {
    for (const mode of ["light", "dark", "system"]) {
      await page.evaluate(
        ({ visual, mode }) => {
          localStorage.setItem("fm-visual-theme", visual);
          localStorage.setItem("fm-theme", mode);
          window.dispatchEvent(new Event("fm-preference-change"));
        },
        { visual, mode },
      );
      await expect(shell).toHaveCSS("background-color", "rgb(250, 249, 246)");
      await expect(shell).toHaveCSS("color", "rgb(36, 36, 32)");
      await expect(shell).toHaveCSS("color-scheme", "light");
    }
  }
  await page.getByRole("tab", { name: "Quỹ an toàn", exact: true }).click();
  await expect(page.locator(".marketing-fund-progress")).toBeVisible();
  await expect(page.locator(".fund-scene, .garden-art")).toHaveCount(0);
  await page.reload();
  await expect(shell).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-visual-theme",
    "water",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .locator(".marketing-hero")
    .getByRole("link", { name: "Bắt đầu sử dụng" })
    .click();
  await expect(page).toHaveURL(/\/login\?next=%2Foverview$/);
  await expect(page.locator(".marketing-shell")).toHaveCount(0);
  await login(page);
  await page.goto("/");
  await expect(page.locator("[data-landing-audience=member]")).toBeVisible();
  await expect(
    page.locator('.story-art .garden-art > [data-visual-only="water"]'),
  ).toBeVisible();
  await expect(page.locator(".marketing-shell")).toHaveCount(0);
  expect(
    await page.evaluate(() => [
      localStorage.getItem("fm-visual-theme"),
      localStorage.getItem("fm-theme"),
    ]),
  ).toEqual(["water", "dark"]);
});
