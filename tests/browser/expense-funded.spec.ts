import { completeTestEmailLogin } from "./helpers/test-email-login";
import { closeMultiFilter, openMultiFilter } from "./helpers/multi-filter";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
import type { ExpenseView } from "../../src/domain/expenses/types";
import type { ExpenseAction } from "../../src/domain/expenses/schema";

const current = vietnamClock().today.slice(0, 7);
const email = () => `${randomUUID()}@example.test`;

// Months from 2026-11 start unfunded; earlier months keep their historical figures.
test.skip(current < "2026-11", "The funded mark applies from November 2026.");

async function view(page: Page): Promise<ExpenseView> {
  const response = await page.request.get("/api/v1/expenses");
  expect(response.ok()).toBe(true);
  return response.json();
}
async function command(page: Page, action: ExpenseAction) {
  const data = await view(page);
  const response = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: data.book?.version ?? 0,
      action,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
async function seed(page: Page) {
  await page.goto("/login?next=/budgets");
  await completeTestEmailLogin(page, email());
  await expect(page).toHaveURL(/\/budgets$/);
  await command(page, { type: "initialize", start: current });
  await command(page, {
    type: "upsertLabel",
    id: randomUUID(),
    kind: "method",
    name: "Tiền mặt",
  });
  for (const [name, amount] of [
    ["Alpha", "3000000"],
    ["Beta", "1000000"],
    ["Gamma", "2000000"],
  ])
    await command(page, {
      type: "createJar",
      id: randomUUID(),
      kind: "monthly",
      start: current,
      opening: "0",
      description: "",
      group: "",
      method: "Tiền mặt",
      name,
      amount,
    });
  await page.reload();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(3);
}
const names = async (page: Page) =>
  (await page.locator(".expense-name-button:visible").allInnerTexts()).map(
    (text) => text.trim().split("\n").pop()!.trim(),
  );
const rowOf = async (page: Page, name: string) =>
  (await view(page)).rows.find((r) => r.month === current && r.name === name)!;
const markButton = (page: Page, name: string) =>
  page.getByRole("button", { name: `Đánh dấu ${name} đã bỏ hũ`, exact: true });
async function openFilters(page: Page) {
  const trigger = page.locator(".filter-options-trigger");
  if (
    (await trigger.isVisible()) &&
    (await trigger.getAttribute("aria-expanded")) === "false"
  )
    await trigger.click();
}

test("a new month starts unfunded and one tap marks and unmarks a jar", async ({
  page,
}) => {
  await seed(page);
  const alpha = await rowOf(page, "Alpha");
  expect(alpha).toMatchObject({ funded: false, funding: "0", spent: "0" });
  expect(alpha.required).toBe("3000000");
  const button = markButton(page, "Alpha");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.locator("[data-size]:visible", { hasText: "Chưa bỏ hũ" }).first(),
  ).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await rowOf(page, "Alpha")).funding)
    .toBe("3000000");
  expect(await rowOf(page, "Alpha")).toMatchObject({
    funded: true,
    spent: "3000000",
  });
  // The other jars are untouched.
  expect(await rowOf(page, "Beta")).toMatchObject({
    funded: false,
    funding: "0",
  });
  await page.reload();
  await expect(markButton(page, "Alpha")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await markButton(page, "Alpha").click();
  await expect(markButton(page, "Alpha")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect.poll(async () => (await rowOf(page, "Alpha")).funding).toBe("0");
});

test("filters jars that still wait for money and resets", async ({ page }) => {
  await seed(page);
  await markButton(page, "Beta").click();
  await expect(markButton(page, "Beta")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await openFilters(page);
  const group = await openMultiFilter(page, "Tình trạng bỏ hũ");
  await group.getByRole("checkbox", { name: /^Chưa bỏ hũ/ }).check();
  await closeMultiFilter(page);
  expect((await names(page)).sort()).toEqual(["Alpha", "Gamma"]);
  await page.reload();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(2);
  await openFilters(page);
  expect((await names(page)).sort()).toEqual(["Alpha", "Gamma"]);
  const again = await openMultiFilter(page, "Tình trạng bỏ hũ");
  await again.getByRole("checkbox", { name: /^Chưa bỏ hũ/ }).uncheck();
  await again.getByRole("checkbox", { name: /^Đã bỏ hũ/ }).check();
  await closeMultiFilter(page);
  expect(await names(page)).toEqual(["Beta"]);
  await page
    .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
    .click();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(3);
});

test("a funded and an unfunded jar look different without relying on colour alone", async ({
  page,
}) => {
  await seed(page);
  await markButton(page, "Alpha").click();
  await expect(markButton(page, "Alpha")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const funded = page.locator(".is-funded:visible", { hasText: "Alpha" });
  const unfunded = page.locator(".is-unfunded:visible", { hasText: "Beta" });
  await expect(funded.first()).toContainText("Đã bỏ hũ");
  await expect(unfunded.first()).toContainText("Chưa bỏ hũ");
  const [a, b] = await Promise.all([
    funded.first().evaluate((el) => getComputedStyle(el).backgroundColor),
    unfunded.first().evaluate((el) => getComputedStyle(el).backgroundColor),
  ]);
  expect(a).not.toBe(b);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("marking a future month through the API is rejected", async ({ page }) => {
  await seed(page);
  const data = await view(page);
  const future = `${Number(current.slice(0, 4))}-12`;
  test.skip(future <= current, "December is the current month.");
  const response = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: data.book!.version,
      action: {
        type: "setJarFunded",
        jarId: data.book!.jars[0].id,
        month: future,
        funded: true,
      },
    },
  });
  expect(response.status()).toBe(422);
});
