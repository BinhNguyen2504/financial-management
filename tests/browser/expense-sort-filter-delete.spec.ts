import { completeTestEmailLogin } from "./helpers/test-email-login";
import { closeMultiFilter, openMultiFilter } from "./helpers/multi-filter";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
import type { ExpenseView } from "../../src/domain/expenses/types";
import type { ExpenseAction } from "../../src/domain/expenses/schema";

const current = vietnamClock().today.slice(0, 7);
const email = () => `${randomUUID()}@example.test`;

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
/** Sets up a book that starts this month with three monthly jars through the API. */
async function seed(page: Page) {
  await page.goto("/login?next=/budgets");
  await completeTestEmailLogin(page, email());
  // A cold server can still be redirecting; reloading mid-navigation detaches the page.
  await expect(page).toHaveURL(/\/budgets$/);
  await command(page, { type: "initialize", start: current });
  for (const [kind, name] of [
    ["method", "Tiền mặt"],
    ["method", "Ví"],
    ["method", "Thẻ"],
    ["group", "Gia đình"],
  ] as const)
    await command(page, { type: "upsertLabel", id: randomUUID(), kind, name });
  const jars = [
    { name: "Alpha", amount: "3000000", method: "Tiền mặt" },
    { name: "Beta", amount: "1000000", method: "Ví" },
    { name: "Gamma", amount: "2000000", method: "Thẻ" },
  ];
  for (const jar of jars)
    await command(page, {
      type: "createJar",
      id: randomUUID(),
      kind: "monthly",
      start: current,
      opening: "0",
      description: "",
      group: "Gia đình",
      ...jar,
    });
  await page.reload();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(3);
}
/** Each name button shows the jar icon on a line of its own before the name. */
const names = async (page: Page) =>
  (await page.locator(".expense-name-button:visible").allInnerTexts()).map(
    (text) => text.trim().split("\n").pop()!.trim(),
  );
async function openFilters(page: Page) {
  const trigger = page.locator(".filter-options-trigger");
  if (
    (await trigger.isVisible()) &&
    (await trigger.getAttribute("aria-expanded")) === "false"
  )
    await trigger.click();
}

test("sorts jars by monthly amount in both directions and keeps the choice", async ({
  page,
}) => {
  await seed(page);
  const key = page.getByRole("combobox", { name: /^Sắp xếp theo/ });
  await key.selectOption("target");
  expect(await names(page)).toEqual(["Beta", "Gamma", "Alpha"]);
  await page.getByRole("button", { name: "Tăng dần", exact: true }).click();
  expect(await names(page)).toEqual(["Alpha", "Gamma", "Beta"]);
  await page.reload();
  await expect(key).toHaveValue("target");
  expect(await names(page)).toEqual(["Alpha", "Gamma", "Beta"]);
  await key.selectOption("");
  await expect(
    page
      .getByRole("button", { name: "Giảm dần", exact: true })
      .or(page.getByRole("button", { name: "Tăng dần", exact: true })),
  ).toBeDisabled();
});

test("clicking a column header cycles largest first, smallest first, then the default", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 900,
    "Header sorting belongs to the desktop table; mobile uses the select.",
  );
  await seed(page);
  const header = page.getByRole("columnheader", { name: /^Mức tháng/ });
  const toggle = header.getByRole("button");
  await toggle.click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  expect(await names(page)).toEqual(["Alpha", "Gamma", "Beta"]);
  await toggle.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  expect(await names(page)).toEqual(["Beta", "Gamma", "Alpha"]);
  await toggle.click();
  await expect(header).toHaveAttribute("aria-sort", "none");
  await expect(
    page.getByRole("combobox", { name: /^Sắp xếp theo/ }),
  ).toHaveValue("");
});

test("filters by several payment methods at once and resets", async ({
  page,
}) => {
  await seed(page);
  await openFilters(page);
  const trigger = page.getByRole("button", { name: /^Phương thức/ });
  await expect(trigger).toContainText("Tất cả");
  const methods = await openMultiFilter(page, "Phương thức");
  await methods
    .getByRole("checkbox", { name: "Tiền mặt", exact: true })
    .check();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(1);
  await expect(trigger).toContainText("Tiền mặt");
  await methods.getByRole("checkbox", { name: "Ví", exact: true }).check();
  await expect(trigger).toContainText("2 đã chọn");
  expect((await names(page)).sort()).toEqual(["Alpha", "Beta"]);
  await closeMultiFilter(page);
  await page.reload();
  await openFilters(page);
  await expect(trigger).toContainText("2 đã chọn");
  await expect(
    (await openMultiFilter(page, "Phương thức")).getByRole("checkbox", {
      name: "Ví",
      exact: true,
    }),
  ).toBeChecked();
  await closeMultiFilter(page);
  await page
    .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
    .click();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(3);
});

test("deleting a jar shows a readable preview and removes it everywhere", async ({
  page,
}) => {
  await seed(page);
  await page
    .locator(".expense-name-button:visible", { hasText: "Beta" })
    .first()
    .click();
  await page.getByRole("button", { name: "Xóa hũ", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Xóa hũ chi tiêu" });
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(dialog.getByText("Đã bỏ dòng").first()).toBeVisible();
  const overflow = await dialog
    .locator(".dialog-body")
    .evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await dialog
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".expense-name-button:visible")).toHaveCount(2);
  const data = await view(page);
  expect(data.rows.some((row) => row.name === "Beta")).toBe(false);
  expect(data.book?.jars.find((jar) => jar.deleted)).toBeTruthy();
  const report = await page.request.get("/api/v1/expenses/reports");
  expect(JSON.stringify(await report.json())).not.toContain("Beta");
});

test("deleting an unknown jar through the API is rejected", async ({
  page,
}) => {
  await seed(page);
  const data = await view(page);
  const response = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: data.book!.version,
      action: { type: "deleteJar", jarId: randomUUID() },
    },
  });
  expect(response.status()).toBe(404);
});

test("the delete-usage confirmation keeps its preview table inside the dialog", async ({
  page,
}) => {
  await seed(page);
  const jarId = randomUUID();
  await command(page, {
    type: "createJar",
    id: jarId,
    kind: "accumulation",
    start: current,
    opening: "5000000",
    name: "Du lịch",
    description: "",
    method: "Tiền mặt",
    group: "Gia đình",
    amount: "1000000",
  });
  await command(page, {
    type: "upsertSpend",
    id: randomUUID(),
    jarId,
    date: vietnamClock().today,
    amount: "200000",
    note: "Vé tàu",
  });
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 780 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await page
      .locator(".expense-name-button:visible", { hasText: "Du lịch" })
      .first()
      .click();
    const detail = page.getByRole("dialog");
    await detail.getByRole("tab", { name: /Các lần sử dụng/ }).click();
    await detail
      .getByRole("button", { name: "Xóa", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Xóa lần sử dụng" });
    await dialog
      .getByRole("button", { name: "Xem trước thay đổi", exact: true })
      .click();
    await expect(dialog.getByText("Du lịch").first()).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(viewport.width - 8);
    // The preview must get a real width instead of the 480px confirmation box.
    if (viewport.width >= 1000) expect(box.width).toBeGreaterThan(600);
    const overflow = await dialog
      .locator(".dialog-body")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
});

test("the report API accepts repeated filter parameters and treats none as no restriction", async ({
  page,
}) => {
  await seed(page);
  const report = async (...pairs: [string, string][]) =>
    JSON.stringify(
      await (
        await page.request.get(
          `/api/v1/expenses/reports?${new URLSearchParams(pairs)}`,
        )
      ).json(),
    );
  const both = await report(["method", "Tiền mặt"], ["method", "Ví"]);
  expect(both).toContain("Alpha");
  expect(both).toContain("Beta");
  expect(both).not.toContain("Gamma");
  const single = await report(["method", "Thẻ"]);
  expect(single).toContain("Gamma");
  expect(single).not.toContain("Alpha");
  const all = await report(["method", ""]);
  for (const name of ["Alpha", "Beta", "Gamma"]) expect(all).toContain(name);
});

test("the edit-jar form changes the icon, and an icon-only change can be saved", async ({
  page,
}) => {
  await seed(page);
  await page
    .locator(".expense-name-button:visible", { hasText: "Alpha" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Sửa hũ / mức mặc định", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sửa hũ và mức mặc định" });
  await dialog.getByLabel("Emoji từ bàn phím", { exact: true }).fill("🚗");
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const alpha = (await view(page)).rows.find((row) => row.name === "Alpha");
  expect(alpha?.emoji).toBe("🚗");
});

test("the filter fields stay aligned, the dropdown stays in view and choosing a value does not move the layout", async ({
  page,
}) => {
  await seed(page);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 780 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await openFilters(page);
    const triggers = page.locator(".multi-filter-trigger");
    // Loại hũ, Phương thức, Nhóm mục đích and Tình trạng bỏ hũ.
    await expect(triggers).toHaveCount(4);
    const boxes = await triggers.evaluateAll((items) =>
      items.map((item) => {
        const { x, y, width, height } = item.getBoundingClientRect();
        return { x, y: y + scrollY, width, height };
      }),
    );
    for (const box of boxes) expect(box.height).toBeGreaterThanOrEqual(44);
    if (viewport.width >= 1000) {
      // One row: same top edge and the same width.
      for (const box of boxes) {
        expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(1);
      }
    } else {
      // Stacked, each using the full panel width.
      for (const [index, box] of boxes.entries()) {
        expect(box.width).toBeGreaterThan(viewport.width * 0.7);
        if (index > 0) expect(box.y).toBeGreaterThan(boxes[index - 1].y + 40);
      }
    }
    const method = page.getByRole("button", { name: /^Phương thức/ });
    await method.scrollIntoViewIfNeeded();
    const group = await openMultiFilter(page, "Phương thức");
    const panel = (await group.boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);
    expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
    const documentTop = () =>
      method.evaluate((item) => item.getBoundingClientRect().top + scrollY);
    const before = await documentTop();
    await group
      .getByRole("checkbox", { name: "Tiền mặt", exact: true })
      .check();
    await expect(method).toContainText("Tiền mặt");
    // The first chosen value reveals "Đặt lại bộ lọc"; it must not push the fields down.
    expect(Math.abs((await documentTop()) - before)).toBeLessThanOrEqual(1);
    // The panel keeps following its field.
    const field = (await method.boundingBox())!;
    const open = (await group.boundingBox())!;
    // Below the field, or above it when there is no room underneath.
    const gap =
      open.y >= field.y
        ? open.y - (field.y + field.height)
        : field.y - (open.y + open.height);
    expect(Math.abs(gap)).toBeLessThanOrEqual(12);
    await closeMultiFilter(page);
    await expect(group).toBeHidden();
    await expect(method).toBeFocused();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await page
      .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
      .click();
  }
});
