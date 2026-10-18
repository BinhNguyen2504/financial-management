import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  backupTables,
  type FullBackupV1,
} from "../../src/domain/backup/format";
import { vietnamClock } from "../../src/domain/expenses/engine";
const origin = () => process.env.TEST_BASE_URL!;
test("backup remains available without import readiness and errors stay beside export", async ({
  page,
}) => {
  await page.route("**/api/v1/data/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), importReady: false },
    });
  });
  await login(page);
  const exportCard = page.getByRole("region", {
    name: "Sao lưu dữ liệu",
    exact: true,
  });
  const importCard = page.getByRole("region", {
    name: "Khôi phục dữ liệu",
    exact: true,
  });
  await expect(importCard).toContainText("Khôi phục chưa được bật");
  await expect(page.locator("#backup-file")).toBeDisabled();
  const download = page.waitForEvent("download");
  await exportCard
    .getByRole("button", { name: "Tải bản sao lưu", exact: true })
    .click();
  const file = await download;
  const backup = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(Object.keys(backup.tables)).toHaveLength(28);
  await expect(
    exportCard.getByRole("link", { name: "Lưu file JSON", exact: true }),
  ).toBeVisible();
  await page.route("**/api/v1/data/backup", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Chưa kết nối được dữ liệu kiểm thử." },
    }),
  );
  await exportCard
    .getByRole("button", { name: "Tải bản sao lưu", exact: true })
    .click();
  await expect(exportCard.getByRole("alert")).toContainText("Chưa kết nối");
  await expect(importCard.getByRole("alert")).toHaveCount(0);
  await expect(
    exportCard.getByRole("link", { name: "Lưu file JSON", exact: true }),
  ).toHaveCount(0);
});
test("explicit save link downloads valid JSON when automatic download is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLAnchorElement.prototype.click = function () {};
  });
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/api/v1/data/backup", async (route) => {
    await gate;
    await route.continue();
  });
  const button = page.getByRole("button", {
    name: "Tải bản sao lưu",
    exact: true,
  });
  await button.click();
  await expect(
    page.getByRole("button", { name: "Đang xuất…", exact: true }),
  ).toBeDisabled();
  release();
  const link = page.getByRole("link", { name: "Lưu file JSON", exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /^blob:/);
  const download = page.waitForEvent("download");
  await link.click();
  const file = await download;
  expect(JSON.parse(await readFile((await file.path())!, "utf8")).format).toBe(
    "financial-manager-full-backup",
  );
});
test("status failure does not silently disable export; unexpected HTML is rejected inline", async ({
  page,
}) => {
  await page.route("**/api/v1/data/status", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Chưa kiểm tra được khôi phục." },
    }),
  );
  await login(page);
  await expect(page.locator(".settings-workspace [role=alert]")).toContainText(
    "Chưa kiểm tra",
  );
  const button = page.getByRole("button", {
    name: "Tải bản sao lưu",
    exact: true,
  });
  await expect(button).toBeEnabled();
  await page.route("**/api/v1/data/backup", (r) =>
    r.fulfill({ contentType: "text/html", body: "<html>Login</html>" }),
  );
  await button.click();
  const exportCard = page.getByRole("region", {
    name: "Sao lưu dữ liệu",
    exact: true,
  });
  await expect(exportCard.getByRole("alert")).toContainText("file JSON hợp lệ");
  await expect(
    exportCard.getByRole("link", { name: "Lưu file JSON", exact: true }),
  ).toHaveCount(0);
});
async function login(page: Page, next = "/settings") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
}
async function command(page: Page, module: string, action: unknown) {
  const view = await (await page.request.get(`/api/v1/${module}`)).json();
  const r = await page.request.post(`/api/v1/${module}/commands`, {
    headers: { origin: origin() },
    data: {
      id: randomUUID(),
      expectedVersion: view.book?.version ?? 0,
      action,
    },
  });
  expect(r.ok(), await r.text()).toBe(true);
}
async function source(page: Page): Promise<FullBackupV1> {
  await login(page, "/profile");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Hồ sơ từ backup");
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  const today = vietnamClock().today,
    month = today.slice(0, 7),
    previous = Number(today.slice(0, 4)) - 1;
  await command(page, "income", {
    type: "upsertOneOff",
    id: randomUUID(),
    month,
    name: "Khoản thu cần giữ",
    description: "",
    amount: "900719925474099312345",
  });
  await command(page, "expenses", {
    type: "initialize",
    start: `${previous}-01`,
  });
  await command(page, "expenses", {
    type: "createJar",
    id: randomUUID(),
    kind: "accumulation",
    start: `${previous}-01`,
    opening: "10000",
    name: "Hũ cũ",
    description: "",
    method: "Tiền mặt",
    group: "",
    amount: "0",
  });
  await command(page, "expenses", { type: "closeYear", year: previous });
  const cash = randomUUID(),
    tx = randomUUID();
  await command(page, "savings", {
    type: "createCategory",
    id: cash,
    kind: "cash",
    start: month,
    name: "Tiết kiệm",
  });
  await command(page, "savings", {
    type: "postTransaction",
    transaction: {
      kind: "openingCash",
      id: tx,
      categoryId: cash,
      date: today,
      amount: "12345",
    },
  });
  await command(page, "savings", {
    type: "reviseTransaction",
    transactionId: tx,
    replacement: null,
    reason: "Giữ lịch sử hủy",
  });
  const wallet = randomUUID();
  await command(page, "investments", {
    type: "createCategory",
    id: wallet,
    kind: "cash",
    start: today,
    name: "Tiền chờ",
  });
  await command(page, "investments", {
    type: "postTransaction",
    transaction: {
      kind: "openingCash",
      id: randomUUID(),
      categoryId: wallet,
      date: today,
      amount: "1000000",
    },
  });
  await page.goto("/settings");
  await expect(
    page.getByRole("button", { name: "Tải bản sao lưu", exact: true }),
  ).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải bản sao lưu", exact: true })
    .click();
  const file = await downloaded;
  return JSON.parse(await readFile((await file.path())!, "utf8"));
}
async function upload(page: Page, backup: unknown) {
  await expect(page.locator("#backup-file")).toBeEnabled();
  await page.locator("#backup-file").setInputFiles({
    name: "financial-manager-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Xem trước bản sao lưu", exact: true }),
  ).toBeVisible();
}
test("full transfer, optional profile failure/retry, download and responsive settings", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const backup = await source(page);
  expect(Object.keys(backup.tables)).toHaveLength(28);
  const context = await browser.newContext({
    baseURL: origin(),
    viewport: page.viewportSize()!,
    isMobile: info.project.use.isMobile,
    hasTouch: info.project.use.hasTouch,
  });
  try {
    const target = await context.newPage();
    await login(target);
    await upload(target, backup);
    const option = target.getByRole("checkbox", {
      name: "Khôi phục họ tên, ngày sinh và giới tính từ file",
    });
    await expect(option).not.toBeChecked();
    await option.check();
    await target.route("**/auth/v1/user", (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({
            status: 400,
            json: { message: "profile unavailable" },
          })
        : route.continue(),
    );
    await target.evaluate(() => scrollTo(0, 0));
    await target.screenshot({
      path: `artifacts/backup-preview-${info.project.name}.png`,
      fullPage: true,
    });
    const confirm = target.getByRole("button", {
      name: "Xác nhận nhập bản sao lưu",
      exact: true,
    });
    await confirm.focus();
    await confirm.press("Enter");
    await expect(target.getByRole("status")).toContainText(
      "Đã khôi phục toàn bộ dữ liệu tài chính",
    );
    await expect(
      target.locator(".settings-workspace [role=alert]"),
    ).toContainText("Chưa lưu được hồ sơ");
    const copy = await (await target.request.get("/api/v1/data/backup")).json();
    expect(copy.tables).toEqual(backup.tables);
    await target.unroute("**/auth/v1/user");
    await target
      .getByRole("button", { name: "Thử khôi phục hồ sơ", exact: true })
      .click();
    await expect(target.getByRole("status")).toContainText("và hồ sơ cá nhân");
    await expect(
      target.getByRole("button", { name: "Thử khôi phục hồ sơ", exact: true }),
    ).toBeHidden();
    expect(
      await target.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await target.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await target.setViewportSize({ width: 320, height: 800 });
    expect(
      await target.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await target.evaluate(() => scrollTo(0, 0));
    await target.screenshot({
      path: `artifacts/backup-dark-320-${info.project.name}.png`,
      fullPage: true,
    });
    await target.goto("/profile");
    await expect(target.getByLabel("Họ và tên", { exact: true })).toHaveValue(
      "Hồ sơ từ backup",
    );
    await target.goto("/overview");
    await expect(
      target.getByRole("complementary", { name: "Khôi phục dữ liệu cũ" }),
    ).toBeHidden();
    await target.goto("/settings");
    await expect(target.locator("#backup-file")).toBeDisabled();
    for (const module of ["budgets", "savings", "investments"]) {
      await target.goto(`/${module}`);
      await expect(
        target.getByRole("button", { name: /Sao lưu JSON|Tải backup JSON/ }),
      ).toHaveCount(0);
      await expect(
        target.getByRole("link", { name: "Xuất backup", exact: true }),
      ).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test("retry after commit keeps one copy and leaves profile untouched by default", async ({
  page,
  browser,
}) => {
  const backup = await source(page);
  const context = await browser.newContext({ baseURL: origin() });
  try {
    const target = await context.newPage();
    await login(target);
    await upload(target, backup);
    let dropped = false;
    await target.route("**/api/v1/data/import", async (route) => {
      if (!dropped) {
        dropped = true;
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort("failed");
      } else await route.continue();
    });
    const confirm = target.getByRole("button", {
      name: "Xác nhận nhập bản sao lưu",
      exact: true,
    });
    await confirm.click();
    await expect(
      target.locator(".settings-workspace [role=alert]"),
    ).toBeVisible();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(target.getByRole("status")).toContainText(
      "Đã khôi phục toàn bộ",
    );
    const copy = await (await target.request.get("/api/v1/data/backup")).json();
    expect(copy.tables).toEqual(backup.tables);
    expect(copy.profile.full_name).toBe("");
  } finally {
    await context.close();
  }
});
test("empty suggestion, session dismissal, errors and single-module data detection", async ({
  page,
}) => {
  await login(page, "/overview");
  const suggestion = page.getByRole("complementary", {
    name: "Khôi phục dữ liệu cũ",
  });
  await expect(suggestion).toBeVisible();
  await page
    .getByRole("button", { name: "Đóng gợi ý khôi phục", exact: true })
    .click();
  await page.reload();
  await expect(suggestion).toBeHidden();
  expect(
    (await (await page.request.get("/api/v1/data/status")).json()).empty,
  ).toBe(true);
  await page.evaluate(() => sessionStorage.clear());
  await page.route("**/api/v1/data/status", (r) =>
    r.fulfill({ status: 503, json: { error: "Thử lại" } }),
  );
  await page.reload();
  await expect(suggestion).toBeHidden();
  await page.unroute("**/api/v1/data/status");
  await command(page, "income", {
    type: "upsertOneOff",
    id: randomUUID(),
    month: vietnamClock().today.slice(0, 7),
    name: "Thu nhập",
    description: "",
    amount: "1",
  });
  await page.reload();
  await expect(suggestion).toBeHidden();
  await page.goto("/settings");
  await expect(page.locator("#backup-file")).toBeDisabled();
});
test("data API rejects anonymous access, wrong origins, malformed files and account changes", async ({
  page,
}) => {
  expect((await page.request.get("/api/v1/data/backup")).status()).toBe(401);
  await login(page);
  const status = await page.request.get("/api/v1/data/status");
  expect(status.headers()["cache-control"]).toBe("private, no-store");
  const empty = {
    format: "financial-manager-full-backup",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: { full_name: "", birth_date: "", gender: "" },
    tables: Object.fromEntries(backupTables.map((t) => [t, []])),
  };
  expect(
    (
      await page.request.post("/api/v1/data/import/preview", {
        headers: { origin: "https://other.example" },
        data: empty,
      })
    ).status(),
  ).toBe(403);
  for (const input of [
    { ...empty, schemaVersion: 99 },
    { format: "financial-manager-savings" },
    { ...empty, tables: {} },
  ])
    expect(
      (
        await page.request.post("/api/v1/data/import/preview", {
          headers: { origin: origin() },
          data: input,
        })
      ).status(),
    ).toBe(422);
  expect(
    (
      await page.request.post("/api/v1/data/import", {
        headers: { origin: origin() },
        data: {
          requestId: randomUUID(),
          targetOwnerId: randomUUID(),
          backup: empty,
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/v1/data/import/preview", {
        headers: { origin: origin() },
        data: { padding: "x".repeat(20 * 1024 * 1024 + 1025) },
      })
    ).status(),
  ).toBe(413);
  await page.locator("#backup-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("bad json"),
  });
  await expect(page.locator(".settings-workspace [role=alert]")).toBeVisible();
  expect(
    (await (await page.request.get("/api/v1/data/status")).json()).empty,
  ).toBe(true);
});
