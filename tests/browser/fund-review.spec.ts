import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
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

test("synthetic Fund review renders garden, pagination, archived locations, history and privacy", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login?next=/funds");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(
    page.getByRole("button", { name: "Bắt đầu xây quỹ" }),
  ).toBeVisible();
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
    max: 1,
    onnotice: () => {},
  });
  try {
    const base = addInvestmentReviewData(
        addSavingsReviewData(buildReviewData({ ownerId })),
      ),
      data = buildFundReviewData(base);
    for (const text of [
      buildReviewSQL(base).seed,
      buildSavingsReviewSQL(base).seed,
      buildInvestmentCloudReviewSQL(base).seed,
      buildFundReviewSQL(data).seed,
    ])
      await admin.unsafe(text);
  } finally {
    await admin.end();
  }
  await page.reload();
  const cards = page.locator(".fund-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("27.000.000");
  await expect(cards.nth(0)).toContainText("50,00%");
  await expect(cards.nth(1)).toContainText("105,00%");
  await expect(cards.nth(1)).toContainText("Vượt mục tiêu 2.100.000");
  await expect(cards.nth(2)).toContainText("25,00%");
  await expect(page.locator(".fund-next")).toContainText("Emergency Fund");
  const living = page.locator(".fund-living");
  await living.getByText("Xem các hũ cấu thành", { exact: true }).click();
  await expect(living.locator(".fund-amount-rows > div")).toHaveCount(5);
  await expect(living.locator(".fund-living-amount")).toContainText(
    "6.000.000",
  );
  await page
    .getByRole("button", { name: "Điều chỉnh mục tiêu", exact: true })
    .click();
  const configure = page.getByRole("dialog");
  const sourceToggle = configure.getByRole("checkbox", {
    name: "Cập nhật mức sinh hoạt từ Chi tiêu hiện tại",
    exact: true,
  });
  const jars = configure.getByRole("group", {
    name: "Các hũ tính vào mức sinh hoạt",
    exact: true,
  });
  await expect(sourceToggle).not.toBeChecked();
  await expect(jars.getByRole("checkbox").first()).toBeDisabled();
  await expect(sourceToggle).toHaveAccessibleDescription(
    /Đang giữ mức sinh hoạt đã xác nhận/,
  );
  await sourceToggle.check();
  await expect(jars.getByRole("checkbox").first()).toBeEnabled();
  await expect(sourceToggle).toHaveAccessibleDescription(
    /Mục tiêu chỉ đổi sau/,
  );
  await sourceToggle.uncheck();
  await configure.getByRole("button", { name: "Đóng", exact: true }).click();
  const ledger = page.locator(".fund-workspace > .panel .fund-ledger");
  await expect(ledger).toContainText("Trang 1/2");
  await ledger.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(ledger).toContainText("Trang 2/2");
  await ledger.getByLabel("Tìm giao dịch", { exact: true }).fill("Sửa xe");
  await expect(ledger).toContainText("1 giao dịch");
  await ledger.getByLabel("Tìm giao dịch", { exact: true }).fill("");
  await page.screenshot({
    path: `artifacts/browser/fund-review-${info.project.name}.png`,
    fullPage: true,
  });
  await cards.nth(1).getByRole("button", { name: /Xem/ }).click();
  const dialog = page.getByRole("dialog");
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const transactions = dialog.locator(".fund-transaction");
  const row = transactions.first();
  const filters = dialog.locator(".fund-filter-options");
  await expect(filters).not.toHaveAttribute("open", "");
  await filters.locator("summary").click();
  await filters
    .getByLabel("Loại giao dịch lọc", { exact: true })
    .selectOption("transfer");
  await filters.locator("summary").click();
  await expect(filters.locator("summary")).toContainText("1");
  await expect(transactions.first()).toContainText("Chuyển tiền");
  await filters.locator("summary").click();
  await filters
    .getByLabel("Loại giao dịch lọc", { exact: true })
    .selectOption("");
  await filters.locator("summary").click();
  await expect(
    row.getByRole("button", { name: "Sửa", exact: true }),
  ).toHaveText("Sửa");
  await expect(
    row.getByRole("button", { name: "Hủy giao dịch", exact: true }),
  ).toHaveText("Hủy giao dịch");
  const rightEdges = await transactions
    .locator(".fund-transaction-amount")
    .evaluateAll((elements) =>
      elements.map((el) => el.getBoundingClientRect().right),
    );
  expect(Math.max(...rightEdges) - Math.min(...rightEdges)).toBeLessThan(2);
  await row.getByRole("button", { name: "Sửa", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toContainText("Sửa giao dịch");
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Giao dịch", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Nơi giữ tiền", exact: true }).click();
  await expect(dialog.locator(".fund-location")).toHaveCount(6);
  await expect(
    dialog.locator(".fund-location-heading button").first(),
  ).toHaveText("Sửa");
  await dialog.screenshot({
    path: `artifacts/browser/fund-layout-locations-${info.project.name}.png`,
  });
  await page.getByRole("tab", { name: "Lịch sử", exact: true }).click();
  const correction = dialog
    .locator(".fund-history details")
    .filter({
      has: page.locator("summary strong", { hasText: "Sửa giao dịch" }),
    })
    .first();
  await correction.locator("summary").click();
  await expect(
    correction.getByRole("heading", { name: "Trước", exact: true }),
  ).toBeVisible();
  await expect(
    correction.getByRole("heading", { name: "Sau", exact: true }),
  ).toBeVisible();
  await expect(correction.locator(".fund-history-reason")).not.toBeEmpty();
  const cancellation = dialog
    .locator(".fund-history details")
    .filter({
      has: page.locator("summary strong", { hasText: "Hủy giao dịch" }),
    })
    .first();
  await cancellation.locator("summary").click();
  await expect(
    cancellation.getByText("Đã hủy; giữ nguyên bản gốc trong lịch sử", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await dialog
      .locator(".dialog-body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await expect(page.getByRole("dialog")).toContainText(
    "hủy khoản bị ghi trùng",
  );
  await page.screenshot({
    path: `artifacts/browser/fund-review-history-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Nơi giữ tiền", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("VIB · đã đối soát");
  await expect(page.getByRole("dialog")).toContainText("Timo · chờ bổ sung");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(cards.nth(0)).not.toContainText("27.000.000");
  await expect(cards.nth(1)).toContainText("105,00%");
  await cards.nth(1).getByRole("button", { name: /Xem/ }).click();
  await page.getByRole("tab", { name: "Lịch sử", exact: true }).click();
  await dialog.locator(".fund-history summary").first().click();
  await expect(dialog.locator(".fund-history")).not.toContainText("6.000.000");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .context()
    .addCookies([
      { name: "fm-locale", value: "en", url: process.env.TEST_BASE_URL! },
    ]);
  await page.reload();
  await page
    .locator(".fund-card")
    .nth(1)
    .getByRole("button", { name: /Rainy Day Fund/ })
    .click();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  const englishCorrection = page
    .locator(".fund-history details")
    .filter({
      has: page.locator("summary strong", { hasText: "Edit transaction" }),
    })
    .first();
  await englishCorrection.locator("summary").click();
  await expect(
    englishCorrection.getByRole("heading", { name: "Before", exact: true }),
  ).toBeVisible();
  await expect(
    englishCorrection.getByRole("heading", { name: "After", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 760 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });
  for (const tab of ["History", "Holding locations", "Transactions"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    expect(
      await dialog
        .locator(".dialog-body")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await dialog.screenshot({
      path: `artifacts/browser/fund-layout-${tab}-320-dark-${info.project.name}.png`,
    });
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
