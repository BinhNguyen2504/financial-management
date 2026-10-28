import { selectMonthYear } from "./helpers/month-year";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { incomeClock } from "../../src/domain/income/engine";
import type { IncomeView } from "../../src/domain/income/types";
import type { IncomeAction } from "../../src/domain/income/schema";
const today = incomeClock().today,
  year = Number(today.slice(0, 4)),
  history = year - 1;
const january = `${history}-01`,
  february = `${history}-02`;
const email = () => `${randomUUID()}@example.test`;
async function login(page: Page, address = email()) {
  await page.goto("/login?next=/income");
  await page.getByLabel("Email", { exact: true }).fill(address);
  const otp = page.waitForResponse((response) =>
    response.url().includes("/auth/v1/otp"),
  );
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/income$/);
  await expect(
    page.getByRole("button", { name: "Nhập thu nhập", exact: true }),
  ).toBeVisible();
  return new URL((await otp).url()).origin;
}
async function view(page: Page, y = year): Promise<IncomeView> {
  const response = await page.request.get(`/api/v1/income?year=${y}`);
  expect(response.ok()).toBe(true);
  return response.json();
}
async function command(page: Page, action: IncomeAction) {
  const v = await view(page);
  return page.request.post("/api/v1/income/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
}
async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
async function confirmPreview(page: Page) {
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
async function selectHistory(page: Page) {
  await page
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption(String(history));
  await expect(
    page.getByRole("combobox", { name: "Năm", exact: true }),
  ).toHaveValue(String(history));
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("1");
}
async function addCategory(page: Page, name = "Lương thử nghiệm") {
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Tên", { exact: true }).fill(name);
  await selectMonthYear(page, "Tháng bắt đầu", january);
  await save(page);
}
async function record(page: Page, name: string, amount: string) {
  await page.getByRole("button", { name: `Nhập ${name}`, exact: true }).click();
  await page.getByLabel("Số tiền thực nhận (VND)").fill(amount);
  await save(page);
}

test("income CRUD, effective history, reports, CSV and responsive themes", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await login(page);
  await selectHistory(page);
  await addCategory(page);
  await record(page, "Lương thử nghiệm", "10000000");
  await record(page, "Lương thử nghiệm", "20000000");
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên", { exact: true })
    .fill("Thưởng một lần");
  await page.getByLabel("Số tiền thực nhận (VND)").fill("5000000");
  await save(page);
  let data = await view(page, history);
  expect(data.book!.categories).toHaveLength(1);
  expect(data.book!.monthly).toHaveLength(1);
  expect(data.book!.monthly[0].amount).toBe("20000000");
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await expect(page.locator(".income-summary")).toContainText("25.000.000 ₫");
  await page
    .getByRole("combobox", { name: "Kỳ", exact: true })
    .selectOption("1");
  const response = await page.request.get(
    `/api/v1/income/reports?year=${history}&from=1&to=3`,
  );
  expect((await response.json()).total).toBe("25000000");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Xuất bảng dữ liệu", exact: true })
    .click();
  const download = await downloadPromise;
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain('"25000000"');
  expect(csv).toContain("Thưởng một lần");
  for (const type of ["columns", "line", "shares", "types"]) {
    await page.getByLabel("Kiểu biểu đồ").selectOption(type);
    await expect(page.locator(".income-chart")).toBeVisible();
  }
  await page.getByLabel("Kiểu biểu đồ").selectOption("line");
  await page.locator(".income-chart svg g").first().focus();
  await expect(page.locator(".income-chart svg g").first()).toBeFocused();
  await page
    .getByRole("combobox", { name: "Loại thu", exact: true })
    .selectOption("oneoff");
  await expect(page.locator(".income-summary")).toContainText("5.000.000 ₫");
  await page
    .getByRole("combobox", { name: "Loại thu", exact: true })
    .selectOption("all");
  const category = (await view(page)).book!.categories[0];
  await page
    .getByRole("combobox", { name: "Danh mục", exact: true })
    .selectOption(category.id);
  await expect(page.locator(".income-summary")).toContainText("20.000.000 ₫");
  await page
    .getByRole("combobox", { name: "Danh mục", exact: true })
    .selectOption("");
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/browser/income-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
  }
  const originalViewport = page.viewportSize()!;
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(originalViewport);
  await page
    .getByRole("button", { name: "Thu phát sinh · xem chi tiết", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Thưởng một lần");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sửa danh mục Lương thử nghiệm", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên", { exact: true })
    .fill("Lương mới");
  await selectMonthYear(page, "Tháng hiệu lực", february);
  await confirmPreview(page);
  await page
    .getByRole("button", { name: "Nhập thu nhập", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lương thử nghiệm", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("2");
  await expect(
    page.getByRole("heading", { name: "Lương mới", exact: true }),
  ).toBeVisible();
  await record(page, "Lương mới", "0");
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ngừng danh mục Lương mới", exact: true })
    .click();
  await selectMonthYear(page, "Tháng hiệu lực", `${history}-03`);
  await confirmPreview(page);
  await page
    .getByRole("button", { name: "Nhập thu nhập", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("3");
  await expect(
    page.getByRole("button", { name: "Nhập Lương mới", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "Xóa số thu Lương thử nghiệm", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("20.000.000 ₫");
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: "Sửa Thưởng một lần", exact: true })
    .click();
  await page.getByLabel("Số tiền thực nhận (VND)").fill("6000000");
  await save(page);
  await page
    .getByRole("button", { name: "Xóa Thưởng một lần", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await addCategory(page, "Chưa có thu");
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xóa danh mục Chưa có thu", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  data = await view(page, history);
  expect(data.book!.monthly).toHaveLength(1);
  expect(data.book!.monthly[0].amount).toBe("0");
  expect(data.book!.oneOffs[0].deleted).toBe(true);
});

test("income network retry and independent session conflicts preserve drafts", async ({
  page,
  browser,
}) => {
  const address = email();
  const authURL = await login(page, address);
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên", { exact: true })
    .fill("Bản nháp giữ lại");
  await page.getByLabel("Số tiền thực nhận (VND)").fill("123");
  await page.route("**/api/v1/income/commands", (route) => route.abort());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".form-error-summary"),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByLabel("Tên", { exact: true }),
  ).toHaveValue("Bản nháp giữ lại");
  await page.unroute("**/api/v1/income/commands");
  const other = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  const second = await other.newPage();
  try {
    // This scenario needs two independent sessions immediately; reset only the
    // isolated Auth double's resend cooldown, as the dedicated OTP suite does.
    const resend = await page.request.post(`${authURL}/__test__/otp-state`, {
      data: { email: address, allowResend: true },
    });
    expect(resend.ok()).toBe(true);
    await login(second, address);
    expect(
      (
        await command(second, {
          type: "createCategory",
          id: randomUUID(),
          start: today.slice(0, 7),
          name: "Thiết bị khác",
          description: "",
        })
      ).ok(),
    ).toBe(true);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lưu", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").locator(".form-error-summary"),
    ).toContainText("phiên khác");
    await page
      .getByRole("button", {
        name: "Tải dữ liệu mới, giữ nội dung nhập",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("dialog").getByLabel("Tên", { exact: true }),
    ).toHaveValue("Bản nháp giữ lại");
    await save(page);
    expect((await view(second)).book!.oneOffs).toHaveLength(1);
    await page
      .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Thêm thu phát sinh", exact: true }),
    ).toBeFocused();
  } finally {
    await other.close();
  }
});

test("income retries a lost response after commit without duplicating income or audit", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên", { exact: true })
    .fill("Mất phản hồi");
  await page.getByLabel("Số tiền thực nhận (VND)").fill("456");
  await page.route("**/api/v1/income/commands", async (route) => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    await route.abort();
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".form-error-summary"),
  ).toBeVisible();
  expect((await view(page)).book!.version).toBe(1);
  const refresh = page.waitForResponse((response) =>
    response.url().includes("/api/v1/income?year="),
  );
  await page.clock.setFixedTime(await page.evaluate(() => Date.now() + 61_000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refresh;
  await page.unroute("**/api/v1/income/commands");
  await save(page);
  const result = await view(page);
  expect(result.book!.version).toBe(1);
  expect(result.book!.oneOffs).toHaveLength(1);
  expect(result.book!.audit).toHaveLength(1);
});

test("income rollover shows empty next-year months and future is read-only", async ({
  page,
}) => {
  await login(page);
  const id = randomUUID();
  expect(
    (
      await command(page, {
        type: "createCategory",
        id,
        start: `${history}-12`,
        name: "Qua năm",
        description: "",
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await command(page, {
        type: "setMonthly",
        categoryId: id,
        month: `${history}-12`,
        amount: "100",
        note: "",
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption(String(history));
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("12");
  await expect(page.locator(".income-summary")).toContainText("100 ₫");
  await page
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption(String(year));
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("1");
  await expect(
    page.getByRole("combobox", { name: "Năm", exact: true }),
  ).toHaveValue(String(year));
  await expect(
    page.getByRole("combobox", { name: "Tháng", exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByRole("button", { name: "Nhập Qua năm", exact: true }),
  ).toBeVisible();
  expect(
    (await view(page)).rows.find((r) => r.month === `${year}-01`)!.amount,
  ).toBeNull();
  await page
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption(String(year + 1));
  await expect(
    page.getByRole("button", { name: "Nhập Qua năm", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Thêm thu phát sinh", exact: true }),
  ).toBeDisabled();
});

test("income API rejects forged auth, CSRF, cross-owner changes and invalid reports", async ({
  page,
  browser,
}) => {
  await page.goto("/income");
  await expect(page).toHaveURL(/\/login\?next=%2Fincome$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await login(page);
  const id = randomUUID();
  expect(
    (
      await command(page, {
        type: "createCategory",
        id,
        start: today.slice(0, 7),
        name: "Riêng tư",
        description: "",
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.get("/api/v1/income", {
        headers: { authorization: "Bearer invalid" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await page.request.post("/api/v1/income/commands", { data: {} })).status(),
  ).toBe(403);
  expect(
    (await page.request.get("/api/v1/income/reports?from=12&to=1")).status(),
  ).toBe(422);
  expect(
    (await page.request.get("/api/v1/income/reports?year=bad")).status(),
  ).toBe(422);
  expect(
    (
      await command(page, {
        type: "setMonthly",
        categoryId: id,
        month: `${year + 1}-01`,
        amount: "1",
        note: "",
      })
    ).status(),
  ).toBe(422);
  const other = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  const second = await other.newPage();
  try {
    await login(second);
    expect((await view(second)).book).toBeNull();
    expect(
      (
        await command(second, {
          type: "setMonthly",
          categoryId: id,
          month: today.slice(0, 7),
          amount: "1",
          note: "",
        })
      ).status(),
    ).toBe(404);
  } finally {
    await other.close();
  }
});

test("income category deletion follows remaining receipts across years, including zero", async ({
  page,
}) => {
  await login(page);
  const id = randomUUID();
  const name = "Nguồn thu có thể xóa";
  expect(
    (
      await command(page, {
        type: "createCategory",
        id,
        start: january,
        name,
        description: "",
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await command(page, {
        type: "setMonthly",
        categoryId: id,
        month: january,
        amount: "0",
        note: "",
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await command(page, {
        type: "setMonthly",
        categoryId: id,
        month: today.slice(0, 7),
        amount: "100",
        note: "",
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Ngừng danh mục ${name}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Xóa danh mục ${name}`, exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await command(page, {
        type: "clearMonthly",
        categoryId: id,
        month: today.slice(0, 7),
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Ngừng danh mục ${name}`, exact: true }),
  ).toBeVisible();
  const blocked = await command(page, {
    type: "deleteCategory",
    categoryId: id,
  });
  expect(blocked.status()).toBe(422);
  await page
    .getByRole("button", { name: "Nhập thu nhập", exact: true })
    .click();
  await selectMonthYear(page, "Chọn tháng và năm", january);
  await page
    .getByRole("button", { name: `Xóa số thu ${name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Xóa danh mục ${name}`, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "hiện không còn số thu ở bất kỳ tháng nào",
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const before = (await view(page)).book!;
  await page
    .getByRole("button", { name: `Xóa danh mục ${name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
  const after = (await view(page)).book!;
  expect(after.categories.find((c) => c.id === id)?.deleted).toBe(true);
  expect(after.audit.slice(0, -1)).toEqual(before.audit);
  await page.reload();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
});

test("income rejects deletion when another session records a receipt after the dialog opens", async ({
  page,
}) => {
  await login(page);
  const id = randomUUID();
  expect(
    (
      await command(page, {
        type: "createCategory",
        id,
        start: january,
        name: "Nguồn thu phiên khác",
        description: "",
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Xóa danh mục Nguồn thu phiên khác",
      exact: true,
    })
    .click();
  expect(
    (
      await command(page, {
        type: "setMonthly",
        categoryId: id,
        month: january,
        amount: "0",
        note: "",
      })
    ).ok(),
  ).toBe(true);
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Dữ liệu đã thay đổi");
  expect(
    (await view(page)).book!.categories.find((c) => c.id === id)?.deleted,
  ).toBe(false);
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Ngừng danh mục Nguồn thu phiên khác",
      exact: true,
    }),
  ).toBeVisible();
});
