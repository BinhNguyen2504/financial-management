import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
const month = vietnamClock().today.slice(0, 7);
async function setup(page: Page) {
  await page.goto("/login?next=/budgets");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/budgets$/);
  await expect(
    page.getByRole("button", { name: "Chọn tháng bắt đầu", exact: true }),
  ).toBeVisible();
  let version = 0;
  const command = async (action: unknown) => {
    const r = await page.request.post("/api/v1/expenses/commands", {
      headers: { origin: process.env.TEST_BASE_URL! },
      data: { id: randomUUID(), expectedVersion: version++, action },
    });
    expect(r.ok(), await r.text()).toBe(true);
  };
  await command({ type: "initialize", start: month });
  for (const [kind, name] of [
    ["method", "HSBC"],
    ["method", "Timo"],
    ["group", "Gia đình"],
  ])
    await command({ type: "upsertLabel", id: randomUUID(), kind, name });
  const ids = [randomUUID(), randomUUID()];
  for (const [i, id] of ids.entries())
    await command({
      type: "createJar",
      id,
      kind: i ? "accumulation" : "monthly",
      start: month,
      opening: i ? "500000" : "0",
      name: i ? "Hũ đã ngừng còn tiền" : "Hũ đang dùng",
      description: "",
      method: "HSBC",
      group: "Gia đình",
      amount: "200000",
    });
  await command({ type: "stopJar", jarId: ids[1], month });
  await page.reload();
  await expect(
    page
      .getByRole("button", { name: "Hũ đang dùng", exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
}

test("classification controls, row alignment, transparent PNG brands and semantic actions", async ({
  page,
}, info) => {
  await setup(page);
  await page.getByRole("button", { name: "Phân loại", exact: true }).click();
  const dialog = page.locator(".expense-dialog[open]:not([inert])");
  for (const tab of ["Phương thức", "Nhóm mục đích"]) {
    await dialog.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
    const rows = dialog.locator("tbody tr").filter({ visible: true });
    for (const row of await rows.all()) {
      await row.scrollIntoViewIfNeeded();
      const name = row.locator(".label-name");
      const box = (await name.boundingBox())!;
      const cell = (await row.locator("td").first().boundingBox())!;
      if (info.project.name === "desktop" || info.project.name === "firefox")
        expect(
          Math.abs(box.y + box.height / 2 - cell.y - cell.height / 2),
        ).toBeLessThan(2);
      const icon = (await name.locator(".label-visual").boundingBox())!;
      const text = (await name.locator("span").last().boundingBox())!;
      expect(text.x - icon.x - icon.width).toBeGreaterThanOrEqual(10);
      expect(
        Math.abs(icon.y + icon.height / 2 - text.y - text.height / 2),
      ).toBeLessThan(2);
    }
    const remove = rows
      .first()
      .getByRole("button", { name: "Xóa", exact: true });
    await remove.hover();
    await expect
      .poll(() => remove.evaluate((e) => getComputedStyle(e).color))
      .toBe(
        await remove.evaluate((e) => {
          const probe = document.createElement("span");
          probe.style.color = "var(--danger)";
          e.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        }),
      );
    await remove.focus();
    await expect(remove).toBeFocused();
    await page.screenshot({ path: info.outputPath(`${tab}-layout.png`) });
  }
  await dialog.getByRole("tab", { name: /^Phương thức/ }).click();
  const img = dialog.locator(".label-visual img").first();
  await expect(img).toHaveAttribute("src", /\.png$/);
  expect(
    await img
      .locator("..")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
  await dialog
    .getByRole("button", { name: "Sửa", exact: true })
    .first()
    .click();
  await expect(
    dialog.getByRole("combobox", { name: "Loại", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.locator(".form-readonly-value")).toHaveText(
    "Phương thức",
  );
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Thêm phân loại", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Loại", exact: true })
    .selectOption("group");
  await expect(
    dialog.getByRole("combobox", { name: "Loại", exact: true }),
  ).toHaveValue("group");
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  const deleteButton = dialog
    .getByRole("button", { name: "Xóa", exact: true })
    .first();
  const darkBackground = await deleteButton.evaluate((element) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--danger-soft)";
    element.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  await expect
    .poll(() =>
      deleteButton.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .toBe(darkBackground);
  await page.screenshot({ path: info.outputPath("labels-dark.png") });
});

test("stopped jars with a remaining balance follow the include-stopped filter", async ({
  page,
}) => {
  await setup(page);
  const toggle = page.getByRole("checkbox", {
    name: "Gồm hũ đã ngừng",
    exact: true,
  });
  const stopped = page
    .getByRole("button", { name: "Hũ đã ngừng còn tiền", exact: true })
    .filter({ visible: true });
  await expect(toggle).not.toBeChecked();
  await expect(stopped).toHaveCount(0);
  await toggle.check();
  await expect(stopped).toBeVisible();
  await toggle.uncheck();
  await expect(stopped).toHaveCount(0);
  await toggle.check();
  await stopped.click();
  await expect(
    page.getByRole("dialog").filter({ hasText: "Hũ đã ngừng còn tiền" }),
  ).toBeVisible();
});

test("stop preview separates period, jar and measure without clipping", async ({
  page,
}, info) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Hũ đang dùng", exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByRole("button", { name: "Ngừng cấp tiền", exact: true })
    .click();
  const dialog = page.locator(".expense-dialog[open]:not([inert])");
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  const preview = dialog.locator(".expense-preview");
  await expect(preview).toBeVisible();
  const cellLabels = preview.locator(".dialog-cell-label");
  if (info.project.name === "desktop" || info.project.name === "firefox")
    await expect(cellLabels.first()).toBeHidden();
  await preview.locator("tbody tr").first().scrollIntoViewIfNeeded();
  await expect(
    preview.getByRole("columnheader", { name: "Tháng", exact: true }),
  ).toHaveCount(1);
  await expect(
    preview.getByRole("columnheader", { name: "Hũ", exact: true }),
  ).toHaveCount(1);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({ path: info.outputPath("stop-preview.png") });
});
