import { visualThemeKeys } from "../../src/components/visual-theme";
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
import {
  applyGoalReviewData,
  buildGoalReviewData,
} from "../../scripts/lib/goal-review-data";
import { postgresGoalRepository } from "../../src/server/goal-repository";
import { readGoalView } from "../../src/application/goals";
import { vietnamClock } from "../../src/domain/shared/clock";

test("Goal review sample renders statuses, transaction pages and retained completion balance", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login?next=/goals");
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
  await expect(page).toHaveURL(/\/goals$/);
  await expect(
    page.getByRole("button", { name: "Tạo mục tiêu đầu tiên" }),
  ).toBeVisible();
  // Both URLs belong to the isolated runner; never use .env.local/cloud in this test.
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 }),
    runtime = postgres(process.env.TEST_DATABASE_URL!, {
      max: 1,
      prepare: false,
    });
  try {
    const base = addInvestmentReviewData(
      addSavingsReviewData(buildReviewData({ ownerId })),
    );
    await admin.unsafe(buildReviewSQL(base).seed);
    await admin.unsafe(buildSavingsReviewSQL(base).seed);
    await admin.unsafe(buildInvestmentCloudReviewSQL(base).seed);
    await admin.unsafe(buildFundReviewSQL(buildFundReviewData(base)).seed);
    const repo = postgresGoalRepository(runtime),
      clock = vietnamClock(),
      original = await readGoalView(repo, ownerId, clock),
      sample = buildGoalReviewData({
        ownerId,
        sources: original.sources,
        clock,
      });
    await applyGoalReviewData(repo, sample, clock.today);
  } finally {
    await admin.end();
    await runtime.end();
  }
  await page.reload();
  await expect(page.locator(".goal-card")).toHaveCount(11);
  await page
    .getByRole("combobox", { name: "Trạng thái", exact: true })
    .selectOption("all");
  await expect(page.locator(".goal-card")).toHaveCount(13);
  const car = page.locator(".goal-card").filter({
    has: page.getByRole("heading", { name: "Mua xe đi làm", exact: true }),
  });
  await expect(car).toContainText("40.000.000");
  await expect(car).toContainText("40%");
  const holiday = page.locator(".goal-card").filter({
    has: page.getByRole("heading", {
      name: "Tết cùng gia đình",
      exact: true,
    }),
  });
  await expect(holiday).toContainText("112,5%");
  await expect(holiday.getByRole("progressbar")).toHaveAttribute(
    "value",
    "100",
  );
  await expect(
    page
      .locator(".goal-card")
      .filter({ hasText: "Đổi laptop phục vụ công việc" }),
  ).toContainText("Quá hạn");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/goal-review-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Xem mục tiêu Mua xe đi làm", exact: true })
    .click();
  const detail = page.getByRole("dialog");
  await detail.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const pagination = detail.getByRole("navigation", {
    name: "Phân trang Giao dịch mục tiêu",
    exact: true,
  });
  await expect(pagination).toContainText("Trang 1 / 2");
  await pagination
    .getByRole("button", { name: "Trang sau", exact: true })
    .click();
  await expect(pagination).toContainText("Trang 2 / 2");
  await detail.getByRole("tab", { name: "Lịch sử", exact: true }).click();
  await expect(detail).toContainText("Hủy giao dịch");
  await detail
    .locator(".dialog-footer")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Xem mục tiêu Khám sức khỏe cho gia đình",
      exact: true,
    })
    .click();
  await expect(detail).toContainText("5.000.000");
  await expect(detail).toContainText("2.000.000");
  await page.screenshot({
    path: `artifacts/browser/goal-review-completed-${info.project.name}.png`,
    fullPage: true,
  });
  await detail
    .locator(".dialog-footer")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  // Render the four reported surfaces with the existing isolated review fixture.
  const capture = async (label: string) => {
    await page.screenshot({
      path: `artifacts/goals-layout-2026-11-05/after/${info.project.name}-${label}.png`,
      fullPage: false,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const dialog of await page.locator("dialog[open]").all()) {
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(-0.1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        page.viewportSize()!.width + 0.1,
      );
      expect(
        await dialog
          .locator(".dialog-body")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    }
  };
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await capture(`${width}-filters`);
    await page
      .getByRole("button", {
        name: "Xem mục tiêu An toàn tài chính",
        exact: true,
      })
      .click();
    await expect(
      detail.getByRole("region", { name: "Tiến độ", exact: true }),
    ).toBeVisible();
    await capture(`${width}-progress`);
    await detail
      .getByRole("tab", { name: "Nguồn liên kết", exact: true })
      .click();
    await capture(`${width}-sources`);
    await detail
      .locator(".dialog-footer")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Xem mục tiêu Mua xe đi làm", exact: true })
      .click();
    await detail.getByRole("tab", { name: "Giao dịch", exact: true }).click();
    const actions = detail.locator(".goal-transaction-actions").first();
    const boxes = await actions.getByRole("button").evaluateAll((buttons) =>
      buttons.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    expect(boxes).toHaveLength(2);
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(0.1);
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(43.9);
      expect(box.height).toBeGreaterThanOrEqual(43.9);
    }
    expect(boxes[1].x - boxes[0].x - boxes[0].width).toBeGreaterThanOrEqual(
      7.9,
    );
    await capture(`${width}-transactions`);
    // Switching tabs retains the transaction filters and pagination.
    const filterToggle = detail.getByRole("button", {
      name: "Bộ lọc giao dịch",
      exact: true,
    });
    if (await filterToggle.isVisible()) await filterToggle.click();
    await expect(
      detail.getByRole("combobox", { name: "Loại giao dịch", exact: true }),
    ).toHaveValue("");

    await detail
      .getByRole("combobox", { name: "Loại giao dịch", exact: true })
      .selectOption("transfer");
    await detail.getByRole("tab", { name: "Lịch sử", exact: true }).click();
    await detail.getByRole("tab", { name: "Giao dịch", exact: true }).click();
    await expect(
      detail.getByRole("combobox", { name: "Loại giao dịch", exact: true }),
    ).toHaveValue("transfer");
    await detail
      .locator(".dialog-footer")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Sắp xếp ưu tiên", exact: true })
      .click();
    await expect(page.locator(".goal-priority-list > li")).toHaveCount(13);
    await capture(`${width}-priority`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
  }
  for (const theme of visualThemeKeys)
    for (const mode of ["light", "dark"]) {
      await page.evaluate(
        ({ theme, mode }) => {
          localStorage.setItem("fm-visual-theme", theme);
          localStorage.setItem("fm-theme", mode);
        },
        { theme, mode },
      );
      await page.reload();
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .getByRole("button", {
            name: "Xem mục tiêu Mua xe đi làm",
            exact: true,
          })
          .click();
        await capture(`${theme}-${mode}-${width}-detail`);
        await detail
          .getByRole("tab", { name: "Giao dịch", exact: true })
          .click();
        await capture(`${theme}-${mode}-${width}-ledger`);
        await detail
          .locator(".dialog-footer")
          .getByRole("button", { name: "Đóng", exact: true })
          .click();
      }
    }
  expect(errors).toEqual([]);
});
