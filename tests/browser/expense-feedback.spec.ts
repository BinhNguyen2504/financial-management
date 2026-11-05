import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";

for (const kind of ["method", "group"]) {
  test(`missing label migration keeps ${kind} editable and every close route available`, async ({
    page,
  }) => {
    await setup(page);
    const before = await (await page.request.get("/api/v1/expenses")).json();
    await page.getByRole("button", { name: "Phân loại", exact: true }).click();
    await page
      .getByRole("button", { name: "Thêm phân loại", exact: true })
      .click();
    const dialog = page.locator(".expense-dialog[open]:not([inert])");
    await dialog
      .getByRole("combobox", { name: "Loại", exact: true })
      .selectOption(kind);
    await dialog.getByLabel("Tên", { exact: true }).fill("Phân loại đang nhập");
    await dialog
      .getByLabel("Biểu tượng", { exact: true })
      .selectOption("wallet");
    await page.route("**/api/v1/expenses/commands?return=view", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "LABEL_VISUALS_MIGRATION_REQUIRED",
          error: "Cần áp dụng migration 202610190002_label_visuals.sql",
        }),
      }),
    );
    await dialog
      .getByRole("button", { name: "Xem trước thay đổi", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Xác nhận lưu", exact: true })
      .click();
    await expect(dialog.locator(".expense-error")).toContainText(
      "hệ thống cần được cập nhật",
    );
    await expect(dialog).not.toContainText("202610190002");
    await expect(dialog.getByLabel("Tên", { exact: true })).toBeEnabled();
    await expect(dialog.getByLabel("Biểu tượng", { exact: true })).toHaveValue(
      "wallet",
    );
    for (const close of ["Đóng", "Hủy", "Escape"]) {
      if (close === "Escape") await page.keyboard.press("Escape");
      else
        await dialog.getByRole("button", { name: close, exact: true }).click();
      const confirm = page.getByRole("dialog", {
        name: "Bỏ thay đổi?",
        exact: true,
      });
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole("button", { name: "Tiếp tục nhập", exact: true })
        .click();
      await expect(dialog.getByLabel("Tên", { exact: true })).toHaveValue(
        "Phân loại đang nhập",
      );
    }
    // A known rejection can be corrected and saved with a new preview.
    await page.unroute("**/api/v1/expenses/commands?return=view");
    await dialog.getByLabel("Biểu tượng", { exact: true }).selectOption("");
    await dialog
      .getByRole("button", { name: "Xem trước thay đổi", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Xác nhận lưu", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Phương thức và nhóm", exact: true }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Tên", { exact: true })).toHaveCount(0);
    const after = await (await page.request.get("/api/v1/expenses")).json();
    expect(after.book.version).toBe(before.book.version + 1);
    expect(
      after.book.labels.find(
        (label: { name: string }) => label.name === "Phân loại đang nhập",
      ).kind,
    ).toBe(kind);
  });
}

test("failed nested classification can be discarded without losing the jar draft", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  const active = page.locator(".expense-dialog[open]:not([inert])");
  await active.getByLabel("Tên hũ", { exact: true }).fill("Hũ đang nhập");
  await active
    .getByRole("button", { name: "Thêm phương thức / nhóm", exact: true })
    .click();
  await active.getByLabel("Tên", { exact: true }).fill("Ví mới");
  await active.getByLabel("Biểu tượng", { exact: true }).selectOption("wallet");
  await page.route("**/api/v1/expenses/commands?return=view", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "LABEL_VISUALS_MIGRATION_REQUIRED",
        error: "Missing migration",
      }),
    }),
  );
  await active
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await active
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(
    active.getByRole("button", { name: "Hủy", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(active.getByLabel("Tên hũ", { exact: true })).toHaveValue(
    "Hũ đang nhập",
  );
  await expect(active.getByLabel("Tên hũ", { exact: true })).toBeEnabled();
});

test("lost command response retries the same id without duplicating a saved classification", async ({
  page,
}) => {
  await setup(page);
  const before = await (await page.request.get("/api/v1/expenses")).json();
  await page.getByRole("button", { name: "Phân loại", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm phân loại", exact: true })
    .click();
  const dialog = page.locator(".expense-dialog[open]:not([inert])");
  await dialog.getByLabel("Tên", { exact: true }).fill("Ví kiểm tra mất mạng");
  const ids: string[] = [];
  await page.route("**/api/v1/expenses/commands?return=view", async (route) => {
    ids.push(route.request().postDataJSON().id);
    const response = await route.fetch();
    if (ids.length === 1) await route.abort("failed");
    else await route.fulfill({ response });
  });
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(
    dialog.getByRole("status").filter({ hasText: "Chưa xác nhận kết quả lưu" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Hủy", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Phương thức và nhóm", exact: true }),
  ).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
  const after = await (await page.request.get("/api/v1/expenses")).json();
  expect(after.book.version).toBe(before.book.version + 1);
  expect(
    after.book.labels.filter(
      (label: { name: string }) => label.name === "Ví kiểm tra mất mạng",
    ),
  ).toHaveLength(1);
});
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

test("expense schema validation keeps oversized amounts out of technical toasts", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Hũ đang dùng", exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByRole("button", { name: "Sửa hũ / mức mặc định", exact: true })
    .click();
  const dialog = page.locator(".expense-dialog[open]:not([inert])");
  const amount = dialog.getByLabel("Mức mặc định mỗi tháng");
  await amount.fill("1234567890123456789012345");
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toBeFocused();
  await expect(dialog.locator('[data-toast-kind="error"]')).toContainText(
    "Kiểm tra các trường được đánh dấu.",
  );
  await expect(dialog).not.toContainText(
    /invalid_format|"pattern"|"origin"|"path"/,
  );
  await expect(amount).toHaveValue("1234567890123456789012345");
});

test("classification controls, row alignment, transparent PNG brands and semantic actions", async ({
  page,
}, info) => {
  await setup(page);
  await page.getByRole("button", { name: "Phân loại", exact: true }).click();
  const dialog = page.locator(".expense-dialog[open]:not([inert])");
  for (const tab of ["Phương thức", "Nhóm mục đích"]) {
    await dialog.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
    const rows = dialog
      .locator(".dialog-compact-list > li")
      .filter({ visible: true });
    for (const row of await rows.all()) {
      await row.scrollIntoViewIfNeeded();
      const name = row.locator(".label-name");
      const box = (await name.boundingBox())!;
      const cell = (await row.locator(".expense-label-row").boundingBox())!;
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
    const remove = rows.first().getByRole("button", { name: /^Xóa / });
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
  await dialog.getByRole("button", { name: /^Sửa / }).first().click();
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
  const deleteButton = dialog.getByRole("button", { name: /^Xóa / }).first();
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
