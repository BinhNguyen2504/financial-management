import { completeTestEmailLogin } from "./helpers/test-email-login";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { toView, vietnamClock } from "../../src/domain/expenses/engine";
import type { ExpenseView } from "../../src/domain/expenses/types";
import type { ExpenseAction } from "../../src/domain/expenses/schema";

const today = vietnamClock().today;
const current = today.slice(0, 7);
const year = Number(current.slice(0, 4));
const prior =
  Number(current.slice(5)) === 1
    ? `${year - 1}-12`
    : `${year}-${String(Number(current.slice(5)) - 1).padStart(2, "0")}`;
const email = () => `${randomUUID()}@example.test`;
async function login(page: Page, address: string) {
  await page.goto("/login?next=/budgets");
  await completeTestEmailLogin(page, address);
  await expect(
    page
      .getByRole("button", { name: "Chọn tháng bắt đầu" })
      .or(page.getByRole("button", { name: "Thêm hũ", exact: true })),
  ).toBeVisible();
}
async function view(page: Page): Promise<ExpenseView> {
  const response = await page.request.get("/api/v1/expenses");
  expect(response.ok()).toBe(true);
  return response.json();
}
async function command(page: Page, action: ExpenseAction) {
  const data = await view(page);
  return page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: data.book?.version ?? 0,
      action,
    },
  });
}
async function confirm(page: Page) {
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
async function ensureLabels(page: Page) {
  for (const [kind, name] of [
    ["method", "Tiền mặt"],
    ["method", "Ví"],
    ["method", "Cash"],
    ["group", "Gia đình"],
  ] as const) {
    if (
      !(await view(page)).book?.labels.some(
        (label) => label.kind === kind && label.name === name,
      )
    )
      expect(
        (
          await command(page, {
            type: "upsertLabel",
            id: randomUUID(),
            kind,
            name,
          })
        ).ok(),
      ).toBe(true);
  }
}
async function create(page: Page, name: string, kind = "monthly") {
  await ensureLabels(page);
  await page.reload();
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  await page.getByLabel("Tên hũ", { exact: true }).fill(name);
  await page.getByRole("dialog").getByLabel("Loại hũ").selectOption(kind);
  await page.getByLabel("Tháng bắt đầu", { exact: true }).fill(prior);
  await page
    .getByLabel("Phương thức", { exact: true })
    .last()
    .selectOption("Tiền mặt");
  await page.getByLabel("Nhóm mục đích (tùy chọn)").selectOption("Gia đình");
  await page.getByLabel("Mức mặc định mỗi tháng").fill("2000000");
  await confirm(page);
}
test("monthly balances, accumulation uses, reports, responsive light/dark", async ({
  page,
}, testInfo) => {
  await login(page, email());
  await page.getByRole("button", { name: "Chọn tháng bắt đầu" }).click();
  await page.getByLabel("Tháng bắt đầu").fill(prior);
  await confirm(page);
  await create(page, "Sinh hoạt kiểm thử");
  let data = await view(page);
  const jar = data.book!.jars[0];
  expect(
    (
      await command(page, {
        type: "editMonth",
        jarId: jar.id,
        month: prior,
        target: null,
        funding: null,
        extra: "0",
        closing: "300000",
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  data = await view(page);
  expect(
    data.rows.find((r) => r.jarId === jar.id && r.month === current)?.required,
  ).toBe("1700000");
  const edit =
    page.viewportSize()!.width <= 639
      ? page.getByRole("button", { name: "Điều chỉnh", exact: true }).first()
      : page.getByRole("button", { name: "Điều chỉnh Sinh hoạt kiểm thử" });
  await edit.click();
  await page.getByLabel("Tiền bổ sung ngoài mức tháng").fill("400000");
  await page.getByLabel("Số dư cuối tháng", { exact: true }).fill("100000");
  await confirm(page);
  data = await view(page);
  expect(
    data.rows.find((r) => r.jarId === jar.id && r.month === current)?.spent,
  ).toBe("2300000");
  await create(page, "Học phí kiểm thử", "accumulation");
  await page.getByRole("button", { name: "Dùng tiền", exact: true }).click();
  await page.getByLabel("Số tiền sử dụng").fill("1500000");
  await page.getByLabel("Ghi chú").fill("Đợt học phí");
  await confirm(page);
  data = await view(page);
  expect(
    data.rows.find((r) => r.kind === "accumulation" && r.month === current)
      ?.closing,
  ).toBe("2500000");
  await page.getByRole("button", { name: "Báo cáo năm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Báo cáo chi tiêu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Biểu đồ", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Biểu đồ so sánh, đơn vị VND" }),
  ).toBeVisible();
  await page.getByLabel("Góc nhìn").selectOption("trend");
  await expect(page.getByRole("img", { name: /Diễn biến tiền/ })).toBeVisible();
  await page.getByRole("button", { name: "Theo tháng", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("expenses-dark.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({
    path: testInfo.outputPath("expenses-light.png"),
    fullPage: true,
  });
  if (testInfo.project.name === "desktop")
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
});
test("network errors preserve drafts and Escape restores keyboard access", async ({
  page,
}, testInfo) => {
  await login(page, email());
  expect(
    (await command(page, { type: "initialize", start: current })).ok(),
  ).toBe(true);
  await ensureLabels(page);
  await page.reload();
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  await page.getByLabel("Tên hũ").fill("Bản nháp còn nguyên");
  await page
    .getByLabel("Phương thức", { exact: true })
    .last()
    .selectOption("Ví");
  await page.getByLabel("Mức mặc định mỗi tháng").fill("500000");
  await page.route("**/api/v1/expenses/preview", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "Xem trước thay đổi" }).click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("Mất kết nối");
  await expect(page.getByLabel("Tên hũ")).toHaveValue("Bản nháp còn nguyên");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.unroute("**/api/v1/expenses/preview");
  await page.getByRole("button", { name: "Xem trước thay đổi" }).click();
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu" }),
  ).toBeVisible();
  await page.route("**/api/v1/expenses/commands", async (route) => {
    await route.fetch();
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("Chưa xác nhận kết quả lưu");
  expect((await view(page)).book?.jars).toHaveLength(1);
  await page.unroute("**/api/v1/expenses/commands");
  await page.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    (await view(page)).book?.audit.filter((row) => row.action === "createJar"),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Bản nháp còn nguyên", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  if (testInfo.project.name === "desktop")
    await expect(
      page.getByRole("button", { name: "Bản nháp còn nguyên", exact: true }),
    ).toBeFocused();
});
test("independent sessions detect conflicts, keep drafts, and reload without overwriting", async ({
  page,
  browser,
}) => {
  const address = email();
  await login(page, address);
  expect(
    (await command(page, { type: "initialize", start: current })).ok(),
  ).toBe(true);
  await ensureLabels(page);
  await page.reload();
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  await page.getByLabel("Tên hũ").fill("Bản nháp đa thiết bị");
  await page
    .getByLabel("Phương thức", { exact: true })
    .last()
    .selectOption("Cash");
  await page.getByLabel("Mức mặc định mỗi tháng").fill("100000");
  const other = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  const second = await other.newPage();
  try {
    await login(second, address);
    expect(
      (
        await command(second, {
          type: "upsertLabel",
          id: randomUUID(),
          kind: "method",
          name: "Thiết bị thứ hai",
        })
      ).ok(),
    ).toBe(true);
    await page.getByRole("button", { name: "Xem trước thay đổi" }).click();
    await expect(
      page.getByRole("dialog").locator(".expense-error"),
    ).toContainText("phiên khác");
    await expect(page.getByLabel("Tên hũ")).toHaveValue("Bản nháp đa thiết bị");
    await page
      .getByRole("button", { name: "Tải dữ liệu mới, giữ nội dung đang nhập" })
      .click();
    await confirm(page);
    const data = await view(second);
    expect(data.book?.jars[0].rules[0].name).toBe("Bản nháp đa thiết bị");
    expect(
      data.book?.labels.some((label) => label.name === "Thiết bị thứ hai"),
    ).toBe(true);
  } finally {
    await other.close();
  }
});
test("archives are read-only, export versioned backups and reject old-year reports", async ({
  page,
}) => {
  await login(page, email());
  const start = `${year - 1}-12`;
  expect((await command(page, { type: "initialize", start })).ok()).toBe(true);
  expect(
    (
      await command(page, {
        type: "createJar",
        id: randomUUID(),
        kind: "accumulation",
        start,
        opening: "100000",
        name: "Lưu trữ",
        description: "",
        method: "Cash",
        group: "",
        amount: "200000",
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await command(page, { type: "closeYear", year: year - 1 })).ok(),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption(String(year - 1));
  await page
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("12");
  await expect(
    page.getByText(
      `Năm ${year - 1} đã chốt. Bạn có thể xem lịch sử. Sao lưu toàn bộ dữ liệu trong Cài đặt.`,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Báo cáo năm", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sửa hũ / mức mặc định" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  const backup = await page.request.get(
    `/api/v1/expenses/years/${year - 1}/backup`,
  );
  expect(backup.ok()).toBe(true);
  expect(await backup.json()).toMatchObject({
    schemaVersion: 1,
    year: year - 1,
    status: "closed",
  });
  expect(
    (
      await page.request.get(`/api/v1/expenses/reports?year=${year - 1}`)
    ).status(),
  ).toBe(422);
});
test("server rejects forged identities, cookie CSRF, and cross-owner edits", async ({
  page,
  browser,
}) => {
  await login(page, email());
  expect(
    (await command(page, { type: "initialize", start: current })).ok(),
  ).toBe(true);
  const id = randomUUID();
  expect(
    (
      await command(page, {
        type: "createJar",
        id,
        kind: "monthly",
        start: current,
        opening: "0",
        name: "Riêng tư",
        description: "",
        method: "Ví",
        group: "",
        amount: "1",
      })
    ).ok(),
  ).toBe(true);
  const forged = await page.request.get("/api/v1/expenses", {
    headers: { authorization: "Bearer invalid-token" },
  });
  expect(forged.status()).toBe(401);
  const csrf = await page.request.post("/api/v1/expenses/commands", {
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const other = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  const second = await other.newPage();
  try {
    await login(second, email());
    expect(
      (await command(second, { type: "initialize", start: current })).ok(),
    ).toBe(true);
    expect((await view(second)).book?.jars).toHaveLength(0);
    const response = await command(second, {
      type: "editMonth",
      jarId: id,
      month: current,
      target: null,
      funding: null,
      extra: "1",
      closing: null,
    });
    expect(response.status()).toBe(404);
  } finally {
    await other.close();
  }
});
test("a foreground refresh at New Year opens January and exits the previous year's report", async ({
  page,
}) => {
  await login(page, email());
  expect(
    (await command(page, { type: "initialize", start: current })).ok(),
  ).toBe(true);
  const original = await view(page);
  let snapshot = toView(original.book, {
    today: `${year}-12-31`,
    now: `${year}-12-31T10:00:00Z`,
  });
  await page.route("**/api/v1/expenses", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.clock.setFixedTime(new Date(`${year}-12-31T23:59:50+07:00`));
  await page.reload();
  await page.getByRole("button", { name: "Báo cáo năm", exact: true }).click();
  snapshot = toView(original.book, {
    today: `${year + 1}-01-01`,
    now: `${year}-12-31T18:00:00Z`,
  });
  await page.clock.setFixedTime(new Date(`${year + 1}-01-01T00:00:01+07:00`));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("combobox", { name: "Năm", exact: true }),
  ).toHaveValue(String(year + 1));
  await expect(
    page.getByRole("combobox", { name: "Tháng", exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByRole("button", { name: "Theo tháng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
