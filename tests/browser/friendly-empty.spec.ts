import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/shared/clock";
import { completeTestEmailLogin } from "./helpers/test-email-login";

test("empty expenses distinguish first entry from filtered results and recover without writing", async ({
  page,
}) => {
  await page.goto("/login?next=/budgets");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(/\/budgets$/);
  const response = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: 0,
      action: { type: "initialize", start: vietnamClock().today.slice(0, 7) },
    },
  });
  expect(response.ok()).toBe(true);
  await page.reload();
  const empty = page.locator(".friendly-empty");
  await expect(empty).toContainText("Chưa có hũ trong tháng này");
  await expect(
    empty.getByRole("button", { name: "Thêm hũ chi tiêu", exact: true }),
  ).toBeVisible();
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/") && request.method() === "POST")
      writes.push(request.url());
  });
  await page.waitForLoadState("networkidle");
  const kind = page.getByRole("combobox", { name: "Loại hũ", exact: true });
  if (await page.locator(".filter-options-trigger").isVisible())
    await page.locator(".filter-options-trigger").click();
  await expect(kind).toBeVisible();
  await kind.selectOption("monthly");
  await expect(empty).toContainText("Không có hũ phù hợp bộ lọc");
  await expect(
    empty.getByRole("button", { name: "Thêm hũ chi tiêu", exact: true }),
  ).toHaveCount(0);
  await empty
    .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
    .click();
  await expect(kind).toHaveValue("");
  await expect(empty).toContainText("Chưa có hũ trong tháng này");
  expect(writes).toEqual([]);
  await empty
    .getByRole("button", { name: "Thêm hũ chi tiêu", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Thêm hũ chi tiêu", exact: true }),
  ).toBeVisible();
});
