import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { completeTestEmailLogin } from "./helpers/test-email-login";
import {
  buildReviewData,
  buildReviewSQL,
} from "../../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "../../scripts/lib/savings-review-data.mjs";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
} from "../../scripts/lib/investment-cloud-review.mjs";
import {
  buildFundReviewData,
  buildFundReviewSQL,
} from "../../scripts/lib/fund-review-data";
import { widgetIds, defaultLayout } from "../../src/domain/overview/layout";
import {
  expenseSummary,
  incomeSummary,
  savingsSummary,
  investmentSummary,
  fundSummary,
} from "../../src/domain/overview/summary";

async function login(page: Page, seed = false) {
  const email = `${randomUUID()}@example.test`;
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/overview");
  await completeTestEmailLogin(page, email);
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
  if (seed) {
    const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
    try {
      const data = addInvestmentReviewData(
        addSavingsReviewData(buildReviewData({ ownerId: owner })),
      );
      await admin.unsafe(buildReviewSQL(data).seed);
      await admin.unsafe(buildSavingsReviewSQL(data).seed);
      await admin.unsafe(buildInvestmentCloudReviewSQL(data).seed);
      await admin.unsafe(buildFundReviewSQL(buildFundReviewData(data)).seed);
    } finally {
      await admin.end();
    }
    await page.reload();
    await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  }
  return { email, owner };
}
async function layout(page: Page) {
  const r = await page.request.get("/api/v1/overview/layout");
  expect(r.ok()).toBe(true);
  return r.json();
}
async function save(
  page: Page,
  widgets: readonly string[],
  jarIds: string[] = [],
) {
  const previous = await layout(page);
  const r = await page.request.put("/api/v1/overview/layout", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      schemaVersion: 1,
      widgets,
      jarIds,
      expectedRevision: previous.revision,
    },
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("six defaults match all five source modules; reads do not create preferences or expose books", async ({
  page,
}) => {
  const anon = await page.request.get("/api/v1/overview");
  expect(anon.status()).toBe(401);
  await login(page, true);
  await expect(page.locator("[data-widget]")).toHaveCount(6);
  expect((await layout(page)).revision).toBe(0);
  const r = await page.request.get("/api/v1/overview"),
    summary = await r.json();
  expect(r.headers()["cache-control"]).toContain("no-store");
  expect(JSON.stringify(summary)).not.toContain('"book"');
  expect(JSON.stringify(summary)).not.toContain('"audit"');
  const readers = {
    expenses: expenseSummary,
    income: incomeSummary,
    savings: savingsSummary,
    investments: investmentSummary,
    funds: fundSummary,
  };
  for (const [key, reader] of Object.entries(readers)) {
    const view = await (await page.request.get(`/api/v1/${key}`)).json();
    expect(summary.sources[key]).toEqual({
      status: "ready",
      data: reader(view),
    });
  }
  const empty = await (
    await page.request.get("/api/v1/overview?widgets=peace")
  ).json();
  expect(empty.sources).toEqual({});
  const invalid = await page.request.get("/api/v1/overview?widgets=networth");
  expect(invalid.status()).toBe(422);
});

test("preview, cancel, keyboard reorder, watched jars, empty layout and defaults persist per account", async ({
  page,
  browser,
}) => {
  const { email } = await login(page, true);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-widget-option]")).toHaveCount(10);
  await dialog.locator('[data-widget-option="jars"] > label input').check();
  const choices = dialog.locator(".overview-jar-options input");
  await expect(choices).toHaveCount(18);
  for (let i = 0; i < 5; i++) await choices.nth(i).check();
  await expect(choices.nth(5)).toBeDisabled();
  await dialog.locator('[data-widget-option="peace"] > label input').check();
  await dialog
    .getByRole("button", { name: "Chuyển Thu nhập tháng này lên", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator("[data-widget-option]").first()).toHaveAttribute(
    "data-widget-option",
    "income",
  );
  await dialog
    .getByRole("button", { name: "Xem thử bố cục", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-widget="jars"] li')).toHaveCount(5);
  expect((await layout(page)).revision).toBe(0);
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.locator('[data-widget="jars"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  await dialog.locator('[data-widget-option="peace"] > label input').check();
  await dialog
    .getByRole("button", { name: "Chuyển Thu nhập tháng này lên", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-widget]").first()).toHaveAttribute(
    "data-widget",
    "income",
  );
  await expect(page.locator('[data-widget="peace"]')).toBeVisible();
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto(process.env.TEST_BASE_URL! + "/login?next=/overview");
    await completeTestEmailLogin(other, email);
    await expect(other.locator('[data-widget="peace"]')).toBeVisible();
    await expect(other.locator("[data-widget]").first()).toHaveAttribute(
      "data-widget",
      "income",
    );
  } finally {
    await context.close();
  }
  await save(page, []);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tổng quan theo cách của bạn" }),
  ).toBeVisible();
  await page.locator(".overview-empty-layout button").click();
  await dialog
    .getByRole("button", { name: "Khôi phục mặc định", exact: true })
    .click();
  expect((await layout(page)).widgets).toEqual([]);
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.locator("[data-widget]")).toHaveCount(6);
  expect((await layout(page)).widgets).toEqual(defaultLayout().widgets);
});

test("save failure retains draft and version conflicts require loading latest", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.locator('[data-widget-option="peace"] input').check();
  await page.route("**/api/v1/overview/layout", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 503,
          json: {
            error: "Chưa lưu được bố cục. Hãy thử lại.",
            code: "STORAGE_UNAVAILABLE",
          },
        })
      : route.continue(),
  );
  await d.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await expect(d.locator('[data-widget-option="peace"] input')).toBeChecked();
  await page.unroute("**/api/v1/overview/layout");
  await save(page, ["income"]);
  await d.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("thiết bị khác");
  await expect(
    d.getByRole("button", { name: "Lưu", exact: true }),
  ).toBeDisabled();
  await d.getByRole("button", { name: "Tải bố cục mới", exact: true }).click();
  await expect(
    d.locator('[data-widget-option="peace"] input'),
  ).not.toBeChecked();
  await expect(
    d.getByRole("button", { name: "Lưu", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true }),
  ).toBeFocused();
});

test("partial source failure preserves successful widgets and labels retained figures; auth clears them", async ({
  page,
}) => {
  await login(page, true);
  const baseline = await (await page.request.get("/api/v1/overview")).json();
  await page.route("**/api/v1/overview?*", async (route) => {
    const data = structuredClone(baseline);
    data.sources.income = { status: "error" };
    await route.fulfill({ json: data });
  });
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  await expect(page.locator('[data-widget="income"]')).toContainText(
    "số liệu lần tải trước",
  );
  await expect(page.locator('[data-widget="expenses"] dl')).toBeAttached();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator('[data-widget="income"]')).toContainText(
    "Chưa tải được nguồn",
  );
  await expect(page.locator('[data-widget="savings"] dl')).toBeVisible();
  await page.unroute("**/api/v1/overview?*");
  await page
    .locator('[data-widget="income"]')
    .getByRole("button", { name: "Thử tải lại" })
    .click();
  await expect(page.locator('[data-widget="income"] dl')).toBeVisible();
  await page.route("**/api/v1/overview?*", (r) =>
    r.fulfill({
      status: 401,
      json: { code: "UNAUTHENTICATED", error: "Phiên hết hạn" },
    }),
  );
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xem thử bố cục", exact: true })
    .click();
  await expect(page.locator(".overview-widget dl")).toHaveCount(0);
  await expect(
    page.locator("main").getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});

test("all ten widgets fit small screens, themes, privacy and English without page errors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, true);
  const data = await (await page.request.get("/api/v1/overview")).json();
  const ids = data.sources.expenses.data.jars
    .slice(0, 5)
    .map((j: { jarId: string }) => j.jarId);
  await save(page, widgetIds, ids);
  await page.reload();
  await expect(page.locator("[data-widget]")).toHaveCount(10);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dark of [false, true]) {
      await page.evaluate(
        ({ dark }) =>
          (document.documentElement.dataset.theme = dark ? "dark" : "light"),
        { dark },
      );
      await fits(page);
    }
  }
  for (const theme of ["forest", "water", "gold", "fire", "earth"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.visualTheme = theme),
      theme,
    );
    await fits(page);
  }
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  const snapshot = await page.locator("main").ariaSnapshot();
  expect(snapshot).not.toMatch(/\d[.,]\d{3}[.,]\d{3} ₫/);
  await expect(page.locator("main")).toContainText("•••••• ₫");
  await page.setViewportSize({ width: 320, height: 780 });
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await expect(d).toBeVisible();
  const box = await d.boundingBox();
  expect(box!.width).toBeCloseTo(320, 0);
  expect(box!.x).toBeCloseTo(0, 0);
  expect(box!.height).toBeCloseTo(780, 0);
  expect(box!.height).toBeLessThanOrEqual(781);
  await page.screenshot({ path: info.outputPath("customize-320.png") });
  await page.keyboard.press("Escape");
  await expect(page.locator(".overview-refresh")).toHaveCount(0);
  await page.goto("/settings");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await page.goto("/overview");
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Overview",
  );
  await expect(page.locator('[data-widget="income"]')).toContainText(
    "Income this month",
  );
  await fits(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("overview-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: info.outputPath("overview-desktop.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
