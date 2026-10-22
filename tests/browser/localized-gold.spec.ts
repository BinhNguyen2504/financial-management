import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("English gold units keep canonical values and decimal drafts survive language changes", async ({
  page,
  context,
}) => {
  await page.goto("/login?next=/settings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("radio", { name: "English", exact: true }).check();
  const settings = await context.newPage();
  await settings.goto("/settings");
  await page.goto("/savings");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Category name", { exact: true }).fill("Vàng");
  await dialog.getByLabel("Asset type", { exact: true }).selectOption("gold");
  const unit = dialog.getByLabel("Gold unit", { exact: true });
  await unit.selectOption({ label: "chi" });
  await expect(unit).toHaveValue("chỉ");
  await unit.selectOption({ label: "luong/tael" });
  await expect(unit).toHaveValue("lượng/cây");
  await unit.selectOption({ label: "chi" });
  await dialog
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirm save", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const view = await (await page.request.get("/api/v1/savings")).json();
  const category = view.book.categories.find(
    (item: { rules: { name: string }[] }) => item.rules[0].name === "Vàng",
  );
  expect(category.unit).toBe("chỉ");
  await page
    .getByRole("button", { name: "Record transaction", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Transaction type", { exact: true })
    .selectOption("openingGold");
  await dialog
    .getByLabel("Category", { exact: true })
    .selectOption(category.id);
  await dialog
    .getByLabel("Transaction date", { exact: true })
    .fill(`${view.today.slice(0, 7)}-01`);
  await dialog
    .getByLabel("Opening cost basis (VND)", { exact: true })
    .fill("1,250,000");
  await dialog.getByLabel("Quantity (chi)", { exact: true }).fill("1.25");
  await dialog
    .getByLabel("Resale price per unit (VND)", { exact: true })
    .fill("1,000,000");
  await settings
    .getByRole("radio", { name: "Tiếng Việt", exact: true })
    .check();
  await expect(
    dialog.getByLabel("Số lượng (chỉ)", { exact: true }),
  ).toHaveValue("1,25");
  await settings.getByRole("radio", { name: "English", exact: true }).check();
  await expect(
    dialog.getByLabel("Quantity (chi)", { exact: true }),
  ).toHaveValue("1.25");
  let command: unknown;
  await page.route("**/api/v1/savings/preview", async (route) => {
    command = route.request().postDataJSON();
    await route.continue();
  });
  await dialog
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await expect
    .poll(() => JSON.stringify(command))
    .toContain('"quantity":"1.25"');
  await dialog
    .getByRole("button", { name: "Confirm save", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved = await (await page.request.get("/api/v1/savings")).json();
  const position = saved.state.positions.find(
    (item: { id: string }) => item.id === category.id,
  );
  expect(position.quantity).toBe("1.25");
  expect(position.unit).toBe("chỉ");
  expect(position.value).toBe("1250000");
  await settings.close();
});
