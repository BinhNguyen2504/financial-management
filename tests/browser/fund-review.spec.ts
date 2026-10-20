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
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
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
  await page.getByRole("tab", { name: "Lịch sử", exact: true }).click();
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
