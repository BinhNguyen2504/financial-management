import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/shared/clock";
import type { FundView } from "../../src/domain/funds/types";

const clock = vietnamClock(),
  month = clock.today.slice(0, 7),
  stamp = new Date(Date.now() - 86400000).toISOString();

async function login(page: Page) {
  await page.goto("/login?next=/funds");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/funds$/);
  await expect(
    page.getByRole("button", { name: "Bắt đầu xây quỹ" }),
  ).toBeVisible();
}
async function command(page: Page, module: string, action: unknown) {
  const v = await (await page.request.get(`/api/v1/${module}`)).json();
  const response = await page.request.post(`/api/v1/${module}/commands`, {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
async function funds(page: Page): Promise<FundView> {
  return (await page.request.get("/api/v1/funds")).json();
}
async function setup(page: Page) {
  await login(page);
  const jar = randomUUID(),
    own = randomUUID(),
    category = randomUUID();
  await command(page, "expenses", { type: "initialize", start: month });
  await command(page, "expenses", {
    type: "createJar",
    id: jar,
    kind: "monthly",
    start: month,
    opening: "0",
    name: "Sinh hoạt thiết yếu",
    description: "",
    method: "Tiền mặt",
    group: "",
    amount: "9000000",
  });
  await command(page, "funds", {
    type: "configure",
    id: randomUUID(),
    jarIds: [jar],
    multipliers: { emergency: "3", rainy_day: "1", sinking: "2" },
    priority: ["emergency", "rainy_day", "sinking"],
    applyLiving: true,
    expectedExpenseVersion: 2,
    sourceMonth: month,
  });
  await command(page, "funds", {
    type: "saveLocation",
    id: own,
    name: "Tiền mặt",
    active: true,
  });
  await command(page, "funds", {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      fundId: "emergency",
      locationId: own,
      amount: "1000000",
      occurredAt: stamp,
      note: "",
    },
  });
  await command(page, "savings", {
    type: "createCategory",
    id: category,
    start: month,
    kind: "cash",
    name: "Ngân hàng tiết kiệm",
    unit: null,
  });
  await command(page, "savings", {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      categoryId: category,
      date: clock.today,
      amount: "50000000",
    },
  });
  await page.reload();
  await expect(page.locator('[data-fund="emergency"]')).toBeVisible();
  return { own, category };
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const body = page.locator("dialog[open]:not([inert]) .dialog-body");
  if (await body.count())
    expect(
      await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
}

test("links a Savings category to a fund, shows balances and warns before a withdrawal", async ({
  page,
}, info) => {
  const { own, category } = await setup(page);
  const emergency = page.locator('[data-fund="emergency"]');

  // Available balance follows the chosen fund and holding place.
  await emergency.getByRole("button", { name: "Thêm tiền" }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
    .selectOption(own);
  await expect(dialog).toContainText("Số dư khả dụng: 1.000.000 ₫");
  await dialog.getByLabel("Quỹ", { exact: true }).selectOption("sinking");
  await expect(dialog).toContainText("Số dư khả dụng: 0 ₫");
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Nơi giữ tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm nơi giữ tiền", exact: true })
    .click();
  dialog = page.locator("dialog[open]:not([inert])");
  await dialog
    .getByLabel("Loại nguồn", { exact: true })
    .selectOption("savings");
  await dialog
    .getByLabel("Danh mục Tiết kiệm", { exact: true })
    .selectOption(category);
  await expect(
    dialog.getByLabel("Tên nơi giữ tiền", { exact: true }),
  ).toHaveValue("Ngân hàng tiết kiệm");
  await fits(page);
  await dialog.screenshot({ path: info.outputPath("link-dialog.png") });
  await dialog.getByRole("button", { name: "Xem trước thay đổi" }).click();
  await dialog.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect(
    page.getByRole("heading", { name: "Thêm nơi giữ tiền", exact: true }),
  ).toHaveCount(0);
  const places = page.getByRole("dialog", {
    name: "Nơi giữ tiền",
    exact: true,
  });
  await expect(places).toContainText("Từ Tiết kiệm");
  await places.screenshot({ path: info.outputPath("places.png") });
  await places.getByRole("button", { name: "Đóng", exact: true }).click();

  // 1 + 50 million against a 27 million target reads as ready.
  await expect(emergency).toContainText("51.000.000");
  await expect(emergency).toContainText("100,00%");
  await expect(emergency).toContainText("Gồm 50.000.000 ₫ từ Tiết kiệm");
  await expect(emergency).toContainText("Đã đủ mức dự phòng");
  await emergency.screenshot({ path: info.outputPath("fund-card.png") });
  await emergency.getByRole("button", { name: "Thêm tiền" }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "Quỹ này còn lấy 50.000.000 ₫ từ Tiết kiệm",
  );
  await expect(
    dialog
      .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
      .locator("option"),
  ).toHaveText(["Chọn nơi giữ", "Tiền mặt"]);
  await dialog
    .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
    .scrollIntoViewIfNeeded();
  await fits(page);
  await dialog.screenshot({ path: info.outputPath("transaction.png") });
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();

  await page.goto("/savings");
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Loại giao dịch", { exact: true })
    .selectOption("withdraw");
  await dialog.getByLabel("Ngày giao dịch", { exact: true }).fill(clock.today);
  await dialog.getByLabel("Số tiền (VND)", { exact: true }).fill("30000000");
  await dialog.getByRole("button", { name: "Xem trước thay đổi" }).click();
  const warning = dialog.locator(".savings-fund-impact");
  await expect(warning).toContainText("Quỹ khẩn cấp");
  await expect(warning).toContainText("51.000.000 ₫ → 21.000.000 ₫");
  await expect(warning).toContainText("Còn thiếu 6.000.000 ₫");
  const confirm = dialog.getByRole("button", { name: "Xác nhận lưu" });
  await expect(confirm).toBeDisabled();
  expect((await funds(page)).state.funds[0].balance).toBe("51000000");
  await fits(page);
  await warning.scrollIntoViewIfNeeded();
  await dialog.screenshot({ path: info.outputPath("warning-light.png") });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await dialog.screenshot({ path: info.outputPath("warning-dark.png") });
  // The consent control sits beside its label, not stacked above it.
  const box = (await warning.getByRole("checkbox").boundingBox())!,
    text = (await warning.locator("label span").boundingBox())!;
  expect(text.x).toBeGreaterThan(box.x + box.width);
  await warning.getByRole("checkbox").check();
  await confirm.click();
  await expect(dialog).toBeHidden();
  expect((await funds(page)).state.funds[0].balance).toBe("21000000");
});

test("a refused retry of an unconfirmed save can be previewed and accepted again", async ({
  page,
}) => {
  const { own, category } = await setup(page);
  await command(page, "funds", {
    type: "saveLocation",
    id: randomUUID(),
    name: "Ngân hàng tiết kiệm",
    active: true,
    savings: { categoryId: category, fundId: "emergency" },
  });
  await page.goto("/savings");
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Loại giao dịch", { exact: true })
    .selectOption("withdraw");
  await dialog.getByLabel("Ngày giao dịch", { exact: true }).fill(clock.today);
  await dialog.getByLabel("Số tiền (VND)", { exact: true }).fill("30000000");
  await dialog.getByRole("button", { name: "Xem trước thay đổi" }).click();
  await dialog.getByRole("checkbox").check();
  // The request never reaches the server, so its outcome is unknown to the dialog.
  await page.route("**/api/v1/savings/commands*", (route) => route.abort(), {
    times: 1,
  });
  const confirm = dialog.getByRole("button", { name: "Xác nhận lưu" });
  await confirm.click();
  await expect(dialog).toContainText("Chưa xác nhận kết quả lưu");
  await command(page, "funds", {
    type: "saveLocation",
    id: own,
    name: "Tiền mặt ở nhà",
    active: true,
  });
  await confirm.click();
  await expect(dialog.locator(".expense-error")).toContainText(
    "làm giảm Quỹ an toàn",
  );
  await dialog.getByRole("button", { name: "Xem trước thay đổi" }).click();
  await dialog.getByRole("checkbox").check();
  await confirm.click();
  await expect(dialog).toBeHidden();
  expect((await funds(page)).state.funds[0].balance).toBe("21000000");
});

test("goal dialog reads every money field back in VND", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/goals");
  await page.getByRole("button", { name: "Tạo mục tiêu đầu tiên" }).click();
  const dialog = page.getByRole("dialog");
  const target = dialog.getByLabel("Số tiền đích (VND)", { exact: true });
  await target.fill("100000000");
  await expect(dialog.locator("#goal-field-goal-target-hint")).toHaveText(
    "100.000.000 ₫",
  );
  await expect(target).toHaveAccessibleDescription("100.000.000 ₫");
  await dialog
    .getByLabel("Góp dự định / tháng (VND)", { exact: true })
    .fill("5000000");
  await expect(dialog.locator("#goal-field-goal-monthly-hint")).toHaveText(
    "5.000.000 ₫",
  );
  await fits(page);
  await dialog.screenshot({ path: info.outputPath("goal-money.png") });
});
