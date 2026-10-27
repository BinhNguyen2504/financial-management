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

test("imported review data renders across budgets, income, savings, overview and privacy", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login?next=/budgets");
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
  await expect(page).toHaveURL(/\/budgets$/);
  await expect(
    page.getByRole("button", { name: "Chọn tháng bắt đầu", exact: true }),
  ).toBeVisible();

  // This test connection is supplied only by the isolated local runner.
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
  try {
    const sample = addSavingsReviewData(buildReviewData({ ownerId }));
    await admin.unsafe(buildReviewSQL(sample).seed);
    await admin.unsafe(buildSavingsReviewSQL(sample).seed);
  } finally {
    await admin.end();
  }
  await page.goto("/budgets");
  await expect(
    page.getByRole("button", { name: "Thúy đại học", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Du lịch", exact: true }),
  ).toBeVisible();
  const view = await (await page.request.get("/api/v1/expenses")).json();
  expect(view.book.jars).toHaveLength(18);
  const desktop = info.project.name === "desktop";
  const cards = page.locator(
    desktop ? ".expense-desktop-table tbody tr" : ".expense-jar-card",
  );
  await expect(cards).toHaveCount(18);
  await page.screenshot({
    path: `artifacts/browser/review-budgets-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Báo cáo năm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Báo cáo chi tiêu", exact: true }),
  ).toBeVisible();

  await page.goto("/income");
  await expect(
    page.getByRole("button", { name: "Nhập Lương FSOFT", exact: true }),
  ).toBeVisible();
  // The current receipt differs in January/March, so compare against API totals.
  const income = await (await page.request.get("/api/v1/income")).json();
  const month = income.today.slice(0, 7);
  const expected = income.rows
    .filter((r: { month: string }) => r.month === month)
    .reduce(
      (sum: bigint, r: { amount: string | null }) =>
        sum + BigInt(r.amount ?? "0"),
      0n,
    );
  await expect(page.locator(".income-summary")).toContainText(
    new Intl.NumberFormat("vi-VN").format(expected),
  );
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator(".income-summary")).not.toContainText(
    new Intl.NumberFormat("vi-VN").format(expected),
  );
  await page.getByRole("button", { name: "Hiện số tiền", exact: true }).click();
  await page.screenshot({
    path: `artifacts/browser/review-income-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/savings");
  await expect(
    page.getByRole("button", { name: "Chi tiết Techcombank", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Chi tiết Ví thần tài MoMo",
      exact: true,
    }),
  ).toBeVisible();
  const savings = await (await page.request.get("/api/v1/savings")).json();
  expect(savings.state.positions).toHaveLength(6);
  expect(savings.state.total).not.toBeNull();
  await page
    .getByRole("button", { name: "Chi tiết Techcombank", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Sổ tiền gửi");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Tài sản theo danh mục", exact: true }),
  ).toContainText("Techcombank");
  await page
    .getByLabel("Từ ngày", { exact: true })
    .fill(`${Number(savings.today.slice(0, 4)) - 1}-12-01`);
  await expect(
    page.getByRole("region", {
      name: "Bảng tiết kiệm theo tháng",
      exact: true,
    }),
  ).toContainText(`${Number(savings.today.slice(0, 4)) - 1}-12`);
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator("main")).not.toContainText(
    new Intl.NumberFormat("vi-VN").format(BigInt(savings.state.total)),
  );
  await page.getByRole("button", { name: "Hiện số tiền", exact: true }).click();
  await page.screenshot({
    path: `artifacts/browser/review-savings-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/overview");
  await expect(page.locator("main")).toContainText("Ăn uống & cà phê");
  await page.screenshot({
    path: `artifacts/browser/review-overview-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
