import { workspaceAction } from "./helpers/workspace-actions";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
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
import { reportCSV } from "../../src/i18n/report-exports/reports";
import type { Report } from "../../src/domain/reports/model";

async function login(page: Page, seed = false) {
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/reports");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page.locator('[data-report-ready="true"]')).toBeVisible();
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
    await expect(page.locator(".reports-metric-value").first()).not.toHaveText(
      "—",
    );
  }
  return owner;
}
const ready = (page: Page) =>
  expect(page.locator('[data-report-ready="true"]')).toHaveAttribute(
    "aria-busy",
    "false",
  );
async function overflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("reports reconcile active-tab CSV and source detail, retain periods and show current goals", async ({
  page,
}, testInfo) => {
  await login(page, true);
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/reports" &&
      new URL(r.url()).searchParams.get("tab") === "cashflow",
  );
  await page
    .locator(".reports-tabs")
    .getByRole("button", { name: "Thu–chi", exact: true })
    .click();
  const report: Report = await (await response).json();
  await ready(page);
  await expect(
    page.getByText("Kỳ này chưa kết thúc", { exact: false }).first(),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await (await workspaceAction(page, "Xuất bảng dữ liệu")).click();
  const file = await download;
  expect(await readFile((await file.path())!, "utf8")).toBe(reportCSV(report));
  const details = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/v1/reports/details",
  );
  await page
    .getByRole("button", {
      name: "Xem nguồn số liệu: Thu nhập đã ghi nhận",
      exact: true,
    })
    .click();
  expect((await details).ok()).toBe(true);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").locator("tbody tr").first(),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", {
      name: "Xem nguồn số liệu: Thu nhập đã ghi nhận",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("combobox", { name: "Kỳ báo cáo", exact: true })
    .selectOption("year");
  await ready(page);
  await expect(page).toHaveURL(/period=year/);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Kỳ báo cáo", exact: true }),
  ).toHaveValue("year");
  await ready(page);
  const point = page.locator(".reports-chart [data-tooltip-key]").first();
  await point.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.locator(".privacy-toggle").click();
  await expect(page.locator(".reports-metric-value").first()).toContainText(
    "••••••",
  );
  await point.focus();
  await expect(page.getByRole("tooltip")).toContainText("••••••");
  await overflow(page);
  await mkdir("artifacts/reports/screenshots", { recursive: true });
  await page.locator(".reports-chart").screenshot({
    path: `artifacts/reports/screenshots/${testInfo.project.name}-chart.png`,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/reports/screenshots/${testInfo.project.name}-cashflow.png`,
    fullPage: false,
  });
  await page
    .locator(".reports-tabs")
    .getByRole("button", { name: "Mục tiêu", exact: true })
    .click();
  await ready(page);
  await expect(
    page
      .getByText(
        "Mục tiêu hiển thị tiến độ hiện tại, độc lập với kỳ báo cáo đang chọn.",
        { exact: false },
      )
      .first(),
  ).toBeVisible();
  await expect(page.locator(".reports-metrics article")).toHaveCount(0);
  await overflow(page);
});

test("private report APIs reject guests and invalid filters; empty and failed modules stay distinct", async ({
  page,
}) => {
  expect((await page.request.get("/api/v1/reports")).status()).toBe(401);
  expect((await page.request.get("/api/v1/reports/details")).status()).toBe(
    401,
  );
  await login(page);
  await expect(
    page.getByText("Thu nhập: Chưa có dữ liệu", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reports-metric-value").first()).toHaveText("—");
  const invalid = await page.request.get("/api/v1/reports?month=13");
  expect(invalid.status()).toBe(422);
  expect(invalid.headers()["cache-control"]).toContain("no-store");
  await page.goto("/reports?month=13");
  await expect(
    page.getByText("Kỳ báo cáo trên URL không hợp lệ."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Về tháng hiện tại" }).click();
  await ready(page);
  await page.route("**/api/v1/reports?**", async (route) => {
    const response = await route.fetch(),
      data = await response.json();
    data.sources.income = { status: "error", empty: false, version: null };
    data.metrics = data.metrics.filter(
      (m: { id: string }) =>
        !m.id.startsWith("income.") && m.id !== "cashflow.difference",
    );
    await route.fulfill({ response, json: data });
  });
  await page
    .getByRole("button", { name: "Cập nhật báo cáo", exact: true })
    .click();
  await expect(page.getByText("Thu nhập: Lỗi tải nguồn")).toBeVisible();
  await overflow(page);
});

test("details detect source changes and the interface recovers from failures without mixing periods", async ({
  page,
}) => {
  const owner = await login(page, true);
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
  try {
    await admin`update public.income_books set version=version+1 where owner_id=${owner}`;
  } finally {
    await admin.end();
  }
  await page
    .getByRole("button", {
      name: "Xem nguồn số liệu: Thu nhập đã ghi nhận",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "Nguồn số liệu đã thay đổi. Cập nhật báo cáo để xem chi tiết mới.",
      ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cập nhật để xem chi tiết", exact: true })
    .click();
  await ready(page);
  await page.route("**/api/v1/reports?**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Chưa tải được Báo cáo. Hãy thử lại." },
    }),
  );
  await page
    .getByRole("button", { name: "Cập nhật báo cáo", exact: true })
    .click();
  await expect(
    page.getByText("Chưa tải được Báo cáo. Hãy thử lại."),
  ).toBeVisible();
  await expect(await workspaceAction(page, "Xuất bảng dữ liệu")).toBeDisabled();
  await page.unroute("**/api/v1/reports?**");
  await page.getByRole("button", { name: "Thử tải lại", exact: true }).click();
  await ready(page);
  await expect(await workspaceAction(page, "Xuất bảng dữ liệu")).toBeEnabled();
  await page.route("**/api/v1/reports?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("tab") === "savings")
      await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page
    .locator(".reports-tabs")
    .getByRole("button", { name: "Tiết kiệm", exact: true })
    .click();
  await page
    .locator(".reports-tabs")
    .getByRole("button", { name: "Đầu tư", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đầu tư cuối kỳ", exact: true }),
  ).toBeVisible();
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Tiết kiệm cuối kỳ", exact: true }),
  ).toHaveCount(0);
});

test("reports translate, fit five themes, and retain the app shell at three widths", async ({
  page,
}, testInfo) => {
  await login(page, true);
  await page.evaluate(() => {
    localStorage.setItem("fm-locale", "en");
    document.cookie = "fm-locale=en; Path=/";
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Reports", exact: true }),
  ).toBeVisible();
  await ready(page);
  await expect(await workspaceAction(page, "Export CSV")).toBeVisible();
  const initial = page.viewportSize()!;
  for (const [index, theme] of [
    "garden",
    "water",
    "gold",
    "fire",
    "earth",
  ].entries()) {
    await page.evaluate((value) => {
      localStorage.setItem("fm-visual-theme", value);
    }, theme);
    await page.reload();
    await ready(page);
    if (testInfo.project.name === "desktop")
      await page.setViewportSize({
        width: [390, 768, 1440][index % 3],
        height: 900,
      });
    await overflow(page);
    await expect(
      page.getByRole("heading", { name: "Ledger difference", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/reports/screenshots/${testInfo.project.name}-${theme}.png`,
      fullPage: false,
    });
  }
  await page.setViewportSize(initial);
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/reports" &&
      new URL(r.url()).searchParams.get("tab") === "funds",
  );
  await page
    .locator(".reports-tabs")
    .getByRole("button", { name: "Safety funds", exact: true })
    .click();
  const report: Report = await (await response).json();
  await ready(page);
  const table = page.getByRole("region", {
    name: "Safety funds at period end",
    exact: true,
  });
  await table
    .getByRole("button", { name: "Progress % ↕", exact: true })
    .click();
  const names = {
    emergency: "Emergency",
    rainy_day: "Rainy Day",
    sinking: "Sinking",
  };
  const ordered = [
    ...report.tables.find((t) => t.id === "funds.balances")!.rows,
  ]
    .sort((a, b) => {
      const left = BigInt(a.percent!.replace(".", "")),
        right = BigInt(b.percent!.replace(".", ""));
      return left < right ? -1 : left > right ? 1 : 0;
    })
    .map((row) => names[row.id as keyof typeof names]);
  await expect(table.locator("tbody tr td:first-child")).toHaveText(ordered);
  await overflow(page);
});
