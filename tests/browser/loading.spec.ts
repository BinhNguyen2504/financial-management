import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/overview$/);
  // Finish the initial request before intercepting a subsequent navigation.
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
}

for (const reduced of [false, true]) {
  test(`login shows progress until the server responds, reduced motion ${reduced}`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
      colorScheme: reduced ? "dark" : "light",
    });
    await page.goto("/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill(`${randomUUID()}@example.test`);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/auth/v1/otp*", async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await page
        .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
        .click();
      const busy = page.getByRole("button", {
        name: "Đang xử lý…",
        exact: true,
      });
      await expect(busy).toBeDisabled();
      await expect(busy).toHaveAttribute("aria-busy", "true");
      const spinner = busy.locator(".loading-spinner");
      await expect(spinner).toBeVisible();
      await expect(spinner).toHaveAttribute("aria-hidden", "true");
      await expect(spinner).toHaveCSS(
        "animation-name",
        reduced ? "none" : "loading-spin",
      );
    } finally {
      release();
    }
    await expect(page.getByLabel("Mã xác nhận", { exact: true })).toBeVisible();
    await expect(page.locator("button .loading-spinner")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeEnabled();
  });
}

test("slow data requests show readable progress across workspaces and themes", async ({
  page,
  isMobile,
}, testInfo) => {
  await login(page);
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
  const hydration: string[] = [];
  page.on("console", (message) => {
    if (/hydrated|hydration|didn't match/i.test(message.text()))
      hydration.push(message.text());
  });
  const screens = [
    ["/overview", /\/api\/v1\/overview(?:\?.*)?$/, "Đang tải Tổng quan…"],
    ["/budgets", "**/api/v1/expenses", "Đang tải dữ liệu chi tiêu…"],
    ["/income", "**/api/v1/income?*", "Đang tải thu nhập…"],
    ["/savings", "**/api/v1/savings?*", "Đang mở sổ tiết kiệm…"],
    ["/investments", "**/api/v1/investments?*", "Đang tải danh mục…"],
    ["/settings", "**/api/v1/data/status", "Đang kiểm tra trạng thái dữ liệu…"],
  ] as const;
  for (const [path, pattern, message] of screens) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(pattern, async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await page.goto(path);
      const status = page
        .locator(".loading-status")
        .filter({ hasText: message })
        .first();
      await expect(status).toBeVisible();
      await expect(status).toHaveAttribute("role", "status");
      const spinner = status.locator(".loading-spinner");
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({
          colorScheme,
          reducedMotion: "no-preference",
        });
        await expect(spinner).toHaveCSS("animation-name", "loading-spin");
        await expect(spinner).toHaveCSS("animation-play-state", "running");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (path === "/income")
          await page.screenshot({
            path: testInfo.outputPath(`loading-${colorScheme}.png`),
            fullPage: true,
          });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(spinner).toBeVisible();
      await expect(spinner).toHaveCSS("animation-name", "none");
      if (isMobile && path === "/income") {
        await page.setViewportSize({ width: 812, height: 375 });
        await expect(status).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.setViewportSize({ width: 375, height: 812 });
      }
    } finally {
      release();
    }
    await expect(page.locator(".loading-status")).toHaveCount(0);
    await page.unroute(pattern);
  }
  expect(hydration).toEqual([]);
});

test("profile uses the server-verified user without an initial browser refetch", async ({
  page,
}) => {
  await login(page);
  let browserLookups = 0;
  await page.route("**/auth/v1/user", async (route) => {
    browserLookups++;
    await route.abort("failed");
  });
  await page.goto("/profile");
  await expect(page.getByLabel("Họ và tên", { exact: true })).toBeVisible();
  await expect(page.locator(".loading-status, .user-loading")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(browserLookups).toBe(0);
});

test("failed loads stop progress and retries show it again until recovery", async ({
  page,
}) => {
  await login(page);
  for (const [path, pattern] of [
    ["/overview", /\/api\/v1\/overview(?:\?.*)?$/],
    ["/budgets", "**/api/v1/expenses"],
    ["/income", "**/api/v1/income?*"],
  ] as const) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let attempts = 0;
    await page.route(pattern, async (route) => {
      if (++attempts === 1)
        await route.fulfill({
          status: 503,
          json: { error: "Kết nối tạm gián đoạn", code: "UNAVAILABLE" },
        });
      else {
        await gate;
        await route.continue();
      }
    });
    try {
      await page.goto(path);
      await expect(
        page.getByText("Kết nối tạm gián đoạn", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".loading-status")).toHaveCount(0);
      await page.getByRole("button", { name: /Thử.*lại/ }).click();
      await expect(
        page.locator(".loading-status .loading-spinner"),
      ).toBeVisible();
    } finally {
      release();
    }
    await expect(page.locator(".loading-status")).toHaveCount(0);
    await expect(
      page.getByText("Kết nối tạm gián đoạn", { exact: true }),
    ).toHaveCount(0);
    await page.unroute(pattern);
  }
});
