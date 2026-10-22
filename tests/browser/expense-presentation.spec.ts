import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";

const month = vietnamClock().today.slice(0, 7);
async function seed(page: Page, count = 3) {
  await page.goto("/login?next=/budgets");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/budgets$/);
  await expect(
    page.getByRole("button", { name: "Chọn tháng bắt đầu", exact: true }),
  ).toBeVisible();
  let version = 0;
  async function command(action: unknown) {
    const response = await page.request.post("/api/v1/expenses/commands", {
      headers: { origin: process.env.TEST_BASE_URL! },
      data: { id: randomUUID(), expectedVersion: version++, action },
    });
    expect(response.ok(), await response.text()).toBe(true);
  }
  await command({ type: "initialize", start: month });
  const brands = ["HSBC", "Techcombank", "Timo"];
  for (const name of brands)
    await command({
      type: "upsertLabel",
      id: randomUUID(),
      kind: "method",
      name,
    });
  await command({
    type: "upsertLabel",
    id: randomUUID(),
    kind: "group",
    name: "Bản thân",
  });
  for (let i = 0; i < count; i++)
    await command({
      type: "createJar",
      id: randomUUID(),
      start: month,
      kind: "monthly",
      name: `Ăn uống & cà phê ${String(i + 1).padStart(2, "0")}`,
      description: "Dữ liệu tổng hợp để kiểm bố cục",
      method: brands[i % brands.length],
      group: "Bản thân",
      amount: "2000000",
      opening: "0",
    });
  await page.reload();
  await expect(
    page.locator(".expense-jar-meta").filter({ visible: true }).first(),
  ).toBeVisible();
}
async function withinViewport(page: Page) {
  const bounds = await page
    .getByRole("dialog", { name: "Cột hiển thị", exact: true })
    .boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(8);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 8);
  expect(bounds!.y).toBeGreaterThanOrEqual(8);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 8);
}

test("column popover never moves the table; compact brands and preferences work across desktop and mobile", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page, 18);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const trigger = page.getByRole("button", {
    name: "Cột hiển thị",
    exact: true,
  });
  const popup = page.getByRole("dialog", { name: "Cột hiển thị", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const table = page.locator(".expense-desktop-table table");
  const before = (await table.boundingBox())!;
  await trigger.click();
  await expect(popup).toBeVisible();
  await withinViewport(page);
  expect((await table.boundingBox())!.y).toBe(before.y);
  await popup
    .getByRole("checkbox", { name: "Hiện cột Mức tháng", exact: true })
    .uncheck();
  await expect(
    table.getByRole("columnheader", { name: "Mức tháng", exact: true }),
  ).toHaveCount(0);
  await popup.getByRole("button", { name: "Khôi phục mặc định" }).click();
  await expect(
    table.getByRole("columnheader", { name: "Mức tháng", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("column-popover.png"),
  });
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator(".expense-section-heading h2").click();
  await expect(popup).toBeHidden();

  const rows = page.locator(".expense-desktop-table tbody tr");
  for (let i = 0; i < 3; i++) {
    const row = rows.nth(i);
    const image = row.locator(".label-visual img");
    await expect(image).toHaveAttribute("src", /-symbol\./);
    expect((await image.boundingBox())!.width).toBeLessThanOrEqual(20);
    expect((await row.boundingBox())!.height).toBeLessThan(170);
    for (const label of await row.locator(".label-name").all()) {
      const icon = (await label.locator(".label-visual").boundingBox())!;
      const text = (await label.locator("span").last().boundingBox())!;
      expect(
        Math.abs(icon.y + icon.height / 2 - text.y - text.height / 2),
      ).toBeLessThan(2);
    }
  }

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 320, height: 740 });
    await trigger.click();
    await expect(popup).toBeVisible();
    await withinViewport(page);
    await page.screenshot({
      path: info.outputPath(`column-320-${colorScheme}.png`),
    });
    await popup.getByRole("button", { name: "Đóng tùy chọn cột" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await trigger.click();
  await expect(popup).toBeVisible();
  await withinViewport(page);
  await popup.getByRole("checkbox").last().scrollIntoViewIfNeeded();
  await expect(popup.getByRole("checkbox").last()).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 320, height: 740 });
  await trigger.click();
  await popup
    .getByRole("checkbox", { name: "Hiện cột Mức tháng", exact: true })
    .uncheck();
  await page.keyboard.press("Escape");
  await page.locator(".expense-jar-card .jar-details summary").first().click();
  await expect(
    page
      .locator(".expense-jar-card")
      .first()
      .locator("dt")
      .filter({ hasText: /^Mức tháng$/ }),
  ).toHaveCount(0);
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    table.getByRole("columnheader", { name: "Mức tháng", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("column popover stays above a scrolling dialog and Escape only dismisses the popover", async ({
  page,
}) => {
  await seed(page);
  await page
    .getByRole("button", { name: "Ăn uống & cà phê 01", exact: true })
    .filter({ visible: true })
    .click();
  const parent = page.locator(".expense-dialog[open]");
  const trigger = parent.getByRole("button", {
    name: "Cột hiển thị",
    exact: true,
  });
  const table = parent.locator("table").filter({ visible: true });
  await trigger.scrollIntoViewIfNeeded();
  const y = (await table.boundingBox())!.y;
  await trigger.click();
  const popup = page.getByRole("dialog", { name: "Cột hiển thị", exact: true });
  await expect(popup).toBeVisible();
  await withinViewport(page);
  expect((await table.boundingBox())!.y).toBe(y);
  await popup.getByRole("checkbox").first().focus();
  await page.keyboard.press("Space");
  await expect(popup.getByRole("checkbox").first()).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(parent).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(parent).toBeHidden();
});
