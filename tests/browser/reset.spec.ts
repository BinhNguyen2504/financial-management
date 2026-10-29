import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { vietnamClock } from "../../src/domain/expenses/engine";

async function login(page: Page) {
  await page.goto("/login?next=%2Fsettings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator("#backup-file")).toBeEnabled();
}
async function income(page: Page) {
  const view = await (await page.request.get("/api/v1/income")).json();
  const response = await page.request.post("/api/v1/income/commands", {
    headers: {
      origin: process.env.TEST_BASE_URL!,
      "X-Data-Generation": String(view.dataGeneration),
    },
    data: {
      id: randomUUID(),
      expectedVersion: view.book?.version ?? 0,
      action: {
        type: "upsertOneOff",
        id: randomUUID(),
        month: vietnamClock().today.slice(0, 7),
        name: "Dữ liệu cần giữ",
        description: "",
        amount: "100000",
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
async function openReset(page: Page) {
  await page
    .locator("#reset-data")
    .getByRole("button", { name: "Làm trống dữ liệu tài chính", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Làm trống dữ liệu tài chính",
    exact: true,
  });
  await expect(
    dialog.getByRole("button", { name: "Hủy", exact: true }),
  ).toBeFocused();
  return dialog;
}
async function backupBeforeReset(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Làm trống dữ liệu tài chính",
    exact: true,
  });
  const download = page.waitForEvent("download");
  await dialog
    .getByRole("button", {
      name: /Tải bản sao lưu trước khi xóa|Tạo bản sao lưu mới/,
    })
    .click();
  const file = await download;
  await expect(dialog.getByRole("checkbox")).toBeVisible();
  const backup = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(Object.keys(backup.tables)).toHaveLength(35);
  return backup;
}
async function confirm(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Làm trống dữ liệu tài chính",
    exact: true,
  });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByLabel("Nhập XÓA TOÀN BỘ để xác nhận", { exact: true })
    .fill("XÓA TOÀN BỘ");
}

test("explains retained data and requires a saved backup before clearing and restoring on the same account", async ({
  page,
}, info) => {
  await login(page);
  await expect(page.locator("#reset-data button")).toBeDisabled();
  await income(page);
  const initial = await (await page.request.get("/api/v1/income")).json();
  await page.request.post("/api/v1/income/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: initial.book.version,
      action: { type: "deleteOneOff", id: initial.book.oneOffs[0].id },
    },
  });
  await page.reload();
  await expect(page.locator("#backup-file")).toBeDisabled();
  const restore = page.getByRole("region", {
    name: "Khôi phục dữ liệu",
    exact: true,
  });
  await restore.getByText(/^Thu nhập ·/).click();
  await expect(restore).toContainText("Thu nhập phát sinh (kể cả đã xóa)");
  await expect(restore).toContainText(
    "Những thao tác này không làm tài khoản trống",
  );
  const dialog = await openReset(page);
  const remove = dialog.getByRole("button", {
    name: "Xóa toàn bộ dữ liệu tài chính",
    exact: true,
  });
  await expect(remove).toBeDisabled();
  const backup = await backupBeforeReset(page);
  await dialog.getByRole("checkbox").check();
  await expect(remove).toBeDisabled();
  await dialog
    .getByLabel("Nhập XÓA TOÀN BỘ để xác nhận", { exact: true })
    .fill("XÓA TOÀN BỘ");
  await expect(remove).toBeEnabled();
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("reset-confirm-320.png") });
  await page.setViewportSize(original);
  await remove.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#reset-data [role=status]")).toContainText(
    "Đã làm trống",
  );
  const status = await (await page.request.get("/api/v1/data/status")).json();
  expect(status).toMatchObject({ empty: true, dataGeneration: 1 });
  await expect(page.locator("#backup-file")).toBeEnabled();
  await page.locator("#backup-file").setInputFiles({
    name: "saved-before-reset.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole("button", { name: "Xác nhận nhập bản sao lưu", exact: true })
    .click();
  await expect(page.locator(".settings-import-result")).toContainText(
    "Đã khôi phục toàn bộ",
  );
  expect(
    (await (await page.request.get("/api/v1/data/backup")).json()).tables,
  ).toEqual(backup.tables);
  await income(page);
  await page.goto("/income");
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Tên", { exact: true }).fill("Sau khi khôi phục");
  const write = page.waitForRequest((request) =>
    request.url().endsWith("/api/v1/income/commands"),
  );
  await editor.getByRole("button", { name: "Lưu", exact: true }).click();
  expect((await write).headers()["x-data-generation"]).toBe("1");
  await expect(editor).toHaveCount(0);
});

test("retains and blocks a draft from another tab after reset", async ({
  page,
}) => {
  await login(page);
  await income(page);
  await page.reload();
  const other = await page.context().newPage();
  try {
    await other.goto("/income");
    await other
      .getByRole("button", { name: "Thêm danh mục", exact: true })
      .click();
    const editor = other.getByRole("dialog");
    await editor.getByLabel("Tên", { exact: true }).fill("Bản nháp cần giữ");
    await page.bringToFront();
    const resetDialog = await openReset(page);
    await backupBeforeReset(page);
    await confirm(page);
    await resetDialog
      .getByRole("button", {
        name: "Xóa toàn bộ dữ liệu tài chính",
        exact: true,
      })
      .click();
    await expect(resetDialog).toHaveCount(0);
    await expect(
      page.getByText("Dữ liệu tài chính đã được làm trống ở tab khác.", {
        exact: false,
      }),
    ).toHaveCount(0);
    await expect(other.locator(".notice")).toContainText(
      "Dữ liệu tài chính đã được làm trống ở tab khác.",
    );
    await other.bringToFront();
    const write = other.waitForResponse((response) =>
      response.url().endsWith("/api/v1/income/commands"),
    );
    await editor.getByRole("button", { name: "Lưu", exact: true }).click();
    const response = await write;
    expect(response.status()).toBe(409);
    expect((await response.json()).code).toBe("DATA_GENERATION_CHANGED");
    await expect(editor.getByLabel("Tên", { exact: true })).toHaveValue(
      "Bản nháp cần giữ",
    );
    await expect(editor).toContainText("Dữ liệu tài chính đã được làm trống");
    expect(
      (await (await page.request.get("/api/v1/data/status")).json()).empty,
    ).toBe(true);
  } finally {
    await other.close();
  }
});

test("accepts a complete backup request above the Next proxy default buffer", async ({
  page,
}) => {
  await login(page);
  const { backupTables } = await import("../../src/domain/backup/format");
  const empty = {
    format: "financial-manager-full-backup",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    profile: { full_name: "", birth_date: "", gender: "" },
    tables: Object.fromEntries(backupTables.map((table) => [table, []])),
  };
  const response = await page.request.post("/api/v1/data/import/preview", {
    headers: {
      origin: process.env.TEST_BASE_URL!,
      "Content-Type": "application/json",
    },
    data: " ".repeat(11 * 1024 * 1024) + JSON.stringify(empty),
  });
  expect(response.status(), await response.text()).toBe(200);
  expect((await response.json()).canImport).toBe(true);
});

test("reset APIs require authentication, origin, saved-backup confirmation and the current account", async ({
  page,
}) => {
  const origin = process.env.TEST_BASE_URL!;
  for (const path of ["reset/prepare", "reset"])
    expect(
      (
        await page.request.post(`/api/v1/data/${path}`, {
          headers: { origin },
          data: {},
        })
      ).status(),
    ).toBe(401);
  await login(page);
  await income(page);
  expect(
    (
      await page.request.post("/api/v1/data/reset/prepare", {
        headers: { origin: "https://other.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const prepared = await page.request.post("/api/v1/data/reset/prepare", {
    headers: { origin },
    data: {},
  });
  const status = await (await page.request.get("/api/v1/data/status")).json();
  const body = {
    operationId: prepared.headers()["x-reset-operation-id"],
    requestId: randomUUID(),
    targetOwnerId: status.ownerId,
    backupSaved: true,
    confirmation: "XÓA TOÀN BỘ",
  };
  for (const change of [{ backupSaved: false }, { confirmation: "" }])
    expect(
      (
        await page.request.post("/api/v1/data/reset", {
          headers: { origin },
          data: { ...body, ...change },
        })
      ).status(),
    ).toBe(422);
  expect(
    (
      await page.request.post("/api/v1/data/reset", {
        headers: { origin },
        data: { ...body, targetOwnerId: randomUUID() },
      })
    ).status(),
  ).toBe(409);
  expect(
    (await (await page.request.get("/api/v1/data/status")).json()).empty,
  ).toBe(false);
});

test("changed data requires a new backup and a lost reset response retries the same request without clearing later data", async ({
  page,
}) => {
  await login(page);
  await income(page);
  await page.reload();
  const dialog = await openReset(page);
  await backupBeforeReset(page);
  await confirm(page);
  await income(page);
  await dialog
    .getByRole("button", { name: "Xóa toàn bộ dữ liệu tài chính", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Dữ liệu đã thay đổi");
  await expect(
    dialog.getByRole("button", {
      name: "Xóa toàn bộ dữ liệu tài chính",
      exact: true,
    }),
  ).toBeDisabled();
  await backupBeforeReset(page);
  await confirm(page);
  let calls = 0;
  const ids: string[] = [];
  await page.route("**/api/v1/data/reset", async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    const response = await route.fetch();
    if (calls++ === 0) {
      await income(page);
      await route.abort("failed");
    } else await route.fulfill({ response });
  });
  await dialog
    .getByRole("button", { name: "Xóa toàn bộ dữ liệu tài chính", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Chưa xác nhận được");
  await dialog
    .getByRole("button", { name: "Kiểm tra kết quả làm trống", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  const status = await (await page.request.get("/api/v1/data/status")).json();
  expect(status).toMatchObject({ empty: false, dataGeneration: 1 });
  await expect(page.locator("#backup-file")).toBeDisabled();
});

test("shows system and account blockers together, localizes diagnosis, and keeps backup available", async ({
  page,
}) => {
  await login(page);
  await income(page);
  await page.route("**/api/v1/data/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        importReady: false,
        resetReady: false,
      },
    });
  });
  await page.reload();
  const restore = page.getByRole("region", {
    name: "Khôi phục dữ liệu",
    exact: true,
  });
  await expect(restore).toContainText("Tài khoản đang có dữ liệu");
  await expect(restore).toContainText("Khôi phục chưa được bật");
  await expect(
    page.getByRole("button", { name: "Tải bản sao lưu", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("#reset-data button")).toBeDisabled();
  await page.getByRole("radio", { name: "English", exact: true }).check();
  const translated = page.getByRole("region", {
    name: "Restore data",
    exact: true,
  });
  await expect(translated).toContainText("This account already has data");
  await translated.getByText(/^Income ·/).click();
  await expect(translated).toContainText("Saved processing records");
  await expect(translated).toContainText("Restore is not enabled");
});
