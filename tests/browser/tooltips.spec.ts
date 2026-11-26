import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { investmentClock } from "../../src/domain/investments/engine";

const today = investmentClock().today;

async function setup(page: Page) {
  await page.goto("/login?next=/investments");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/investments$/);
  const response = await page.request.post("/api/v1/investments/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: 0,
      action: {
        type: "createCategory",
        id: randomUUID(),
        walletId: randomUUID(),
        start: today,
        kind: "investment",
        name: "Quỹ thử",
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Thêm danh mục", exact: true }),
  ).toBeEnabled();
}

async function tabTo(page: Page, name: string) {
  const target = page.getByRole("button", { name, exact: true });
  await page.keyboard.press("Tab");
  await target.focus();
  return target;
}

test("icon commands explain themselves on hover and keyboard focus", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Hover needs a fine pointer.");
  await setup(page);
  const tooltip = page.getByRole("tooltip");
  const details = page.getByRole("button", {
    name: "Chi tiết Quỹ thử",
    exact: true,
  });
  await details.hover();
  await expect(tooltip).toHaveText("Chi tiết");
  // The scrolling table must not clip it.
  const hint = (await tooltip.boundingBox())!;
  const button = (await details.boundingBox())!;
  expect(hint.y + hint.height).toBeLessThanOrEqual(button.y);
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);

  await details.click();
  const dialog = page.getByRole("dialog", { name: "Quỹ thử", exact: true });
  await expect(dialog).toBeVisible();
  // Opening a dialog never pops a tooltip, so one Escape still closes it.
  await expect(tooltip).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(tooltip).toHaveCount(0);

  await details.click();
  const deposit = await tabTo(page, "Nạp tiền");
  await expect(dialog.getByRole("tooltip")).toHaveText("Nạp tiền");
  await expect(deposit).toHaveAttribute("aria-describedby", /.+/);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await expect(deposit).not.toHaveAttribute("aria-describedby", /.+/);
  await expect(dialog).toBeVisible();
  // A close button's tooltip never delays closing.
  const close = dialog.getByRole("button", { name: "Đóng", exact: true });
  await close.hover();
  await expect(tooltip).toHaveText("Đóng");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(tooltip).toHaveCount(0);
});

test("controls show a tooltip only while their text is hidden", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Hover needs a fine pointer.");
  await setup(page);
  const tooltip = page.getByRole("tooltip");
  const privacy = page.getByRole("button", {
    name: "Ẩn số tiền",
    exact: true,
  });
  const link = page
    .locator(".sidebar .navigation")
    .getByRole("link", { name: "Cài đặt", exact: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const control of [privacy, link]) {
    await control.hover();
    await expect(tooltip).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Thu gọn menu", exact: true }).click();
  await link.hover();
  await expect(tooltip).toHaveText("Cài đặt");
  await page.setViewportSize({ width: 600, height: 900 });
  await privacy.hover();
  await expect(tooltip).toHaveText("Ẩn số tiền");
});

test("touch taps leave no tooltip behind", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Touch behaviour.");
  await setup(page);
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "Hiện số tiền", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});
