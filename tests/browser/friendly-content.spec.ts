import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
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

async function login(page: Page, seed = true) {
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/income");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(/\/income$/);
  await expect(page.locator("main .month-year-field")).toBeVisible();
  await page.waitForLoadState("networkidle");
  if (seed) {
    const db = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      max: 1,
      onnotice: () => {},
    });
    try {
      const data = addInvestmentReviewData(
        addSavingsReviewData(buildReviewData({ ownerId: owner })),
      );
      for (const sql of [
        buildReviewSQL(data).seed,
        buildSavingsReviewSQL(data).seed,
        buildInvestmentCloudReviewSQL(data).seed,
        buildFundReviewSQL(buildFundReviewData(data)).seed,
      ])
        await db.unsafe(sql);
    } finally {
      await db.end();
    }
    await page.reload();
  }
  return owner;
}

async function go(page: Page, route: string) {
  await page.goto(`/${route}`);
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("new users get actionable empty states and guidance without financial writes", async ({
  page,
}) => {
  await login(page, false);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/api/v1/") &&
      !["GET", "HEAD"].includes(request.method())
    )
      writes.push(request.url());
  });
  await expect(
    page.getByText("Chưa có nguồn thu trong tháng này", { exact: true }),
  ).toBeVisible();
  await page.locator(".page-guide summary").click();
  await expect(page.locator(".page-guide-copy")).toContainText(
    "sửa số thu tháng sẽ thay số cũ",
  );
  await page
    .getByRole("button", { name: "Ghi khoản thu thêm", exact: true })
    .click();
  await page.getByLabel("Tên", { exact: true }).fill("Khoản thu đang nhập");
  await page.getByRole("button", { name: /Hiểu khoản thu đang nhập/ }).click();
  const help = page.locator("dialog[open]").last();
  await expect(help.locator(".page-guide-copy")).toContainText(
    "Đọc kết quả ra sao",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Tên", { exact: true })).toHaveValue(
    "Khoản thu đang nhập",
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await go(page, "overview");
  for (const id of ["income", "expenses", "savings", "investments", "funds"]) {
    const card = page.locator(`[data-widget="${id}"]`);
    await expect(card.locator(".friendly-empty")).toBeVisible();
    await expect(card.locator(".overview-next-step")).toBeVisible();
  }
  await page.getByRole("link", { name: /Mở Thu nhập để ghi nhận/ }).click();
  await expect(page).toHaveURL(/\/income$/);
  expect(writes).toEqual([]);
});

test("every working page explains its figures in both languages and fits narrow screens", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  const directory = `artifacts/friendly-content-2026-11-04/${info.project.name}`;
  await mkdir(directory, { recursive: true });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "overview",
      "income",
      "budgets",
      "savings",
      "investments",
      "funds",
      "goals",
      "reports",
      "settings",
      "profile",
    ]) {
      await go(page, route);
      await expect(page.locator(".page-guide summary")).toBeVisible();
      await page.screenshot({
        path: `${directory}/${route}-${width}-default.png`,
      });
      await page.locator(".page-guide summary").click();
      await expect(page.locator(".page-guide-copy")).toContainText(
        "Bắt đầu thế nào",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} ${width}`,
      ).toBe(true);
      await page.screenshot({ path: `${directory}/${route}-${width}.png` });
    }
  }
  await page.evaluate(() => {
    localStorage.setItem("fm-locale", "en");
    document.cookie = "fm-locale=en; Path=/";
  });
  await go(page, "funds");
  await expect(
    page.getByRole("heading", { name: "Emergency fund", exact: true }),
  ).toBeVisible();
  await page.locator(".page-guide summary").click();
  await expect(page.locator(".page-guide-copy")).toContainText(
    "How to read the results",
  );
  expect(await page.locator(".page-guide-copy").innerText()).not.toMatch(
    /[ĂăÂâĐđÊêÔôƠơƯư]/u,
  );
});

test("overview guidance preserves money privacy across themes and text zoom", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const directory = `artifacts/friendly-content-2026-11-04/${info.project.name}`;
  await mkdir(directory, { recursive: true });
  for (const theme of ["forest", "water", "gold", "fire", "earth"]) {
    await page.evaluate((theme) => {
      localStorage.setItem("fm-visual-theme", theme);
      localStorage.setItem("fm-theme", "dark");
    }, theme);
    await go(page, "overview");
    await expect(page.locator("html")).toHaveAttribute(
      "data-visual-theme",
      theme,
    );
    await page.locator(".page-guide summary").click();
    await page.screenshot({ path: `${directory}/overview-${theme}-dark.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator(".overview-value-main").first()).not.toContainText(
    "25.100.000",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({ path: `${directory}/overview-zoom-privacy.png` });
});
