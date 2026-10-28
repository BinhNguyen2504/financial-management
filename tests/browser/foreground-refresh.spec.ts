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
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
}

async function command(
  page: Page,
  domain: "income" | "expenses",
  action: unknown,
) {
  const current = await (await page.request.get(`/api/v1/${domain}`)).json();
  const response = await page.request.post(`/api/v1/${domain}/commands`, {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: current.book?.version ?? 0,
      action,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

function visibleName(page: Page, name: string) {
  return page
    .getByRole("button", { name, exact: true })
    .or(page.getByText(name, { exact: true }))
    .filter({ visible: true })
    .first();
}

async function setup(page: Page, path: string) {
  await login(page);
  const domain: "income" | "expenses" =
    path === "/income" ? "income" : "expenses";
  const view = await (await page.request.get(`/api/v1/${domain}`)).json();
  const month = view.today.slice(0, 7);
  const id = randomUUID();
  if (domain === "expenses") {
    await command(page, domain, { type: "initialize", start: month });
    await command(page, domain, {
      type: "createJar",
      id,
      start: month,
      kind: "monthly",
      opening: "0",
      name: "Dữ liệu ban đầu",
      description: "",
      method: "Tiền mặt",
      group: "",
      amount: "1000000",
    });
  } else {
    await command(page, domain, {
      type: "createCategory",
      id,
      start: month,
      name: "Dữ liệu ban đầu",
      description: "",
    });
  }
  if (path === "/overview") {
    const response = await page.request.put("/api/v1/overview/layout", {
      headers: { origin: process.env.TEST_BASE_URL! },
      data: {
        schemaVersion: 1,
        widgets: ["jars"],
        jarIds: [id],
        expectedRevision: 0,
      },
    });
    expect(response.ok()).toBe(true);
  }
  const now = Date.now();
  await page.clock.setFixedTime(now);
  await page.goto(path);
  await expect(visibleName(page, "Dữ liệu ban đầu")).toBeVisible();
  await expect(page.locator(".loading-status")).toHaveCount(0);
  return { domain, month, id, now };
}

async function returned(page: Page) {
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
}

for (const path of ["/overview", "/budgets", "/income"]) {
  test(`${path}: short returns skip reads; stale returns update once without loading or layout shifts`, async ({
    page,
    isMobile,
  }, info) => {
    const { domain, month, id, now } = await setup(page, path);
    await page.emulateMedia({
      colorScheme: isMobile ? "dark" : "light",
      reducedMotion: "reduce",
    });
    if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
    const pattern =
      path === "/overview"
        ? "**/api/v1/overview?*"
        : domain === "income"
          ? "**/api/v1/income?*"
          : "**/api/v1/expenses";
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    await page.route(pattern, async (route) => {
      calls++;
      await gate;
      await route.continue();
    });
    try {
      await page.clock.setFixedTime(now + 10_000);
      await returned(page);
      await page.waitForTimeout(150);
      expect(calls).toBe(0);
      await command(
        page,
        domain,
        domain === "income"
          ? {
              type: "configureCategory",
              categoryId: id,
              month,
              name: "Dữ liệu mới từ server",
              description: "",
            }
          : {
              type: "configureJar",
              jarId: id,
              month,
              name: "Dữ liệu mới từ server",
              description: "",
              method: "Tiền mặt",
              group: "",
              amount: "2000000",
            },
      );
      const original = visibleName(page, "Dữ liệu ban đầu");
      const before = await original.boundingBox();
      await page.clock.setFixedTime(now + 61_000);
      await returned(page);
      await expect.poll(() => calls).toBe(1);
      await returned(page);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await expect(page.locator(".loading-status")).toHaveCount(0);
      await expect(original).toBeVisible();
      expect(await original.boundingBox()).toEqual(before);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(calls).toBe(1);
      if (path === "/budgets")
        await page.screenshot({
          path: info.outputPath("background-refresh.png"),
          fullPage: true,
        });
    } finally {
      release();
    }
    await expect(visibleName(page, "Dữ liệu mới từ server")).toBeVisible();
    await expect(page.locator(".loading-status")).toHaveCount(0);
    await returned(page);
    await page.waitForTimeout(150);
    expect(calls).toBe(1);
  });
}

test("background failures keep content, explicit retry recovers, and expired sessions clear it", async ({
  page,
}) => {
  for (const path of ["/overview", "/budgets", "/income"]) {
    const { domain, now } = await setup(page, path);
    const pattern =
      path === "/overview"
        ? "**/api/v1/overview?*"
        : domain === "income"
          ? "**/api/v1/income?*"
          : "**/api/v1/expenses";
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Chưa cập nhật được dữ liệu", code: "UNAVAILABLE" },
      }),
    );
    await page.clock.setFixedTime(now + 61_000);
    await returned(page);
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Chưa cập nhật được dữ liệu",
    );
    await expect(visibleName(page, "Dữ liệu ban đầu")).toBeVisible();
    await expect(page.locator(".loading-status")).toHaveCount(0);
    await page.unroute(pattern);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(pattern, async (route) => {
      await gate;
      await route.continue();
    });
    const recovered = page.waitForResponse(
      (response) =>
        response
          .url()
          .includes(`/api/v1/${path === "/overview" ? "overview?" : domain}`) &&
        response.request().method() === "GET",
    );
    const retry = page.getByRole("button", {
      name: "Thử tải lại",
      exact: true,
    });
    try {
      await retry.click();
      await expect(retry).toBeDisabled();
      await expect(retry).toHaveAttribute("aria-busy", "true");
      await expect(retry.locator(".loading-spinner")).toBeVisible();
      await expect(page.locator(".loading-status")).toHaveCount(0);
    } finally {
      release();
    }
    await recovered;
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await page.unroute(pattern);
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 401,
        json: { error: "Phiên đăng nhập đã hết hạn", code: "UNAUTHENTICATED" },
      }),
    );
    await page.clock.setFixedTime(now + 122_000);
    await returned(page);
    await expect(
      page
        .locator("main")
        .getByRole("link", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(visibleName(page, "Dữ liệu ban đầu")).toHaveCount(0);
    await page.unroute(pattern);
    // New independent account on the next iteration.
    await page.context().clearCookies();
  }
});

test("hidden/offline returns wait; reconnection refreshes fresh data without losing a form draft", async ({
  page,
}) => {
  const { now } = await setup(page, "/income");
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  const draft = page.getByRole("dialog").getByLabel("Tên", { exact: true });
  await draft.fill("Bản nháp được giữ lại");
  let calls = 0;
  await page.route("**/api/v1/income?*", async (route) => {
    calls++;
    await route.continue();
  });
  await page.clock.setFixedTime(now + 10_000);
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    }),
  );
  await returned(page);
  await page.waitForTimeout(100);
  expect(calls).toBe(0);
  await page.context().setOffline(true);
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    }),
  );
  await returned(page);
  await page.waitForTimeout(100);
  expect(calls).toBe(0);
  const refreshed = page.waitForResponse((response) =>
    response.url().includes("/api/v1/income?"),
  );
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    }),
  );
  await page.context().setOffline(false);
  await page.waitForTimeout(100);
  expect(calls).toBe(0);
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    }),
  );
  await returned(page);
  await refreshed;
  await expect(draft).toHaveValue("Bản nháp được giữ lại");
  await expect(draft).toBeFocused();
  await expect(page.locator(".loading-status")).toHaveCount(0);
  expect(calls).toBe(1);
  await page.evaluate(() => {
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });
});
