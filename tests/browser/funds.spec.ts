import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
import type { FundView } from "../../src/domain/funds/types";
const clock = vietnamClock(),
  month = clock.today.slice(0, 7),
  stamp = new Date(Date.now() - 86400000).toISOString();
const origin = () => process.env.TEST_BASE_URL!;
async function login(page: Page) {
  await page.goto("/login?next=/funds");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/funds$/);
  await expect(
    page.getByRole("button", { name: "Bắt đầu xây quỹ" }),
  ).toBeVisible();
}
async function view(page: Page): Promise<FundView> {
  const r = await page.request.get("/api/v1/funds");
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function expense(page: Page, action: unknown) {
  const v = await (await page.request.get("/api/v1/expenses")).json();
  const r = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: origin() },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(r.ok(), await r.text()).toBe(true);
}
async function command(page: Page, action: unknown) {
  const v = await view(page);
  const r = await page.request.post("/api/v1/funds/commands", {
    headers: { origin: origin() },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function source(page: Page) {
  const jar = randomUUID();
  await expense(page, { type: "initialize", start: month });
  await expense(page, {
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
  return jar;
}
async function setup(page: Page) {
  await login(page);
  const jar = await source(page);
  await command(page, {
    type: "configure",
    id: randomUUID(),
    jarIds: [jar],
    multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
    priority: ["rainy_day", "emergency", "sinking"],
    applyLiving: true,
    expectedExpenseVersion: 2,
    sourceMonth: month,
  });
  const bank = randomUUID(),
    cash = randomUUID();
  for (const [id, name] of [
    [bank, "Ngân hàng"],
    [cash, "Tiền mặt"],
  ])
    await command(page, { type: "saveLocation", id, name, active: true });
  await page.reload();
  await expect(page.locator('[data-fund="emergency"]')).toBeVisible();
  return { jar, bank, cash };
}
async function save(page: Page) {
  const titleId = await page
    .getByRole("dialog")
    .getAttribute("aria-labelledby");
  const d = page.locator(`dialog[aria-labelledby="${titleId}"]`);
  await d
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    d.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toBeVisible();
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d).toBeHidden();
}
async function post(
  page: Page,
  bank: string,
  amount: string,
  extra: Record<string, unknown> = {},
) {
  return command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      fundId: "emergency",
      locationId: bank,
      amount,
      occurredAt: stamp,
      note: "Khoản góp tổng hợp",
      ...extra,
    },
  });
}
test("onboarding links living expense, requires user x, previews without writing and saves priorities", async ({
  page,
}) => {
  await login(page);
  expect((await view(page)).book).toBeNull();
  await source(page);
  await page.reload();
  await page.getByRole("button", { name: "Bắt đầu xây quỹ" }).click();
  await page.getByLabel(/Sinh hoạt thiết yếu/).check();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const emergency = page.getByLabel("Emergency Fund — hệ số x", {
    exact: true,
  });
  await expect(emergency).toHaveValue("");
  await emergency.fill("6");
  await page.getByLabel("Rainy Day Fund — hệ số x", { exact: true }).fill("1");
  await page.getByLabel("Sinking Fund — hệ số x", { exact: true }).fill("2.5");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page
    .getByRole("button", { name: "Ưu tiên Rainy Day Fund lên", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  expect((await view(page)).book).toBeNull();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toContainText("54.000.000");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".fund-next")).toContainText("Rainy Day Fund");
  expect((await view(page)).book?.configurations[0].priority[0]).toBe(
    "rainy_day",
  );
});
test("nested transactions, atomic transfers, corrections and filters retain parent state", async ({
  page,
}) => {
  const s = await setup(page);
  await page
    .getByRole("button", { name: "Xem Emergency Fund", exact: true })
    .click();
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const parent = page.locator("dialog").first();
  await parent.getByLabel("Tìm giao dịch", { exact: true }).fill("bổ sung");
  await parent
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
    .selectOption(s.bank);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("1000000");
  await page.getByLabel("Ghi chú", { exact: true }).fill("bổ sung dự phòng");
  await save(page);
  await expect(parent).toBeVisible();
  await expect(parent.getByLabel("Tìm giao dịch")).toHaveValue("bổ sung");
  await expect(parent.locator(".fund-transaction")).toHaveCount(1);
  await parent.getByRole("button", { name: "Sửa", exact: true }).click();
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("1200000");
  await page.getByLabel("Lý do sửa hoặc hủy").fill("Đối soát lại");
  await save(page);
  await expect(parent).toContainText("1.200.000");
  await parent.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .locator(".fund-ledger")
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await page
    .getByLabel("Loại giao dịch", { exact: true })
    .selectOption("transfer");
  await page.getByLabel("Quỹ nguồn", { exact: true }).selectOption("emergency");
  await page.getByLabel("Nơi nguồn", { exact: true }).selectOption(s.bank);
  await page.getByLabel("Quỹ nhận", { exact: true }).selectOption("rainy_day");
  await page.getByLabel("Nơi nhận", { exact: true }).selectOption(s.cash);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("200000");
  await page.getByLabel("Lý do giao dịch", { exact: true }).fill("Phân bổ lại");
  await save(page);
  await expect
    .poll(async () => (await view(page)).state.funds.map((f) => f.balance))
    .toEqual(["1000000", "200000", "0"]);
  expect((await view(page)).state.contributed).toBe("1200000");
  await page.getByLabel("Quỹ lọc", { exact: true }).selectOption("rainy_day");
  await expect(page.locator(".fund-transaction")).toHaveCount(1);
  await expect(page.locator(".fund-transaction")).toContainText("Phân bổ lại");
});
test("changed living source stays pending until preview and explicit acceptance", async ({
  page,
}) => {
  const s = await setup(page);
  await expense(page, {
    type: "configureJar",
    jarId: s.jar,
    month,
    name: "Sinh hoạt thiết yếu",
    description: "",
    method: "Tiền mặt",
    group: "",
    amount: "10000000",
  });
  await page.reload();
  await expect(page.locator(".fund-source-change")).toBeVisible();
  await expect(page.locator('[data-fund="emergency"]')).toContainText(
    "54.000.000",
  );
  await page
    .getByRole("button", { name: "Xem lại mức sinh hoạt", exact: true })
    .click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toContainText("60.000.000");
  expect((await view(page)).state.funds[0].target).toBe("54000000");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.locator(".fund-source-change")).toHaveCount(0);
  await expect(page.locator('[data-fund="emergency"]')).toContainText(
    "60.000.000",
  );
});
test("version conflicts preserve drafts and lost save responses retry once", async ({
  page,
}) => {
  const s = await setup(page);
  await page
    .locator('[data-fund="emergency"]')
    .getByRole("button", { name: "Thêm tiền", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
    .selectOption(s.bank);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await post(page, s.bank, "5");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Dữ liệu đã đổi",
  );
  await page
    .getByRole("button", {
      name: "Tải dữ liệu mới, giữ nội dung nhập",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "100",
  );
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await page.route(
    "**/api/v1/funds/commands",
    async (route) => {
      await route.fetch();
      await route.abort();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Chưa xác nhận kết quả lưu",
  );
  await expect(
    page.getByLabel("Số tiền (VND)", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await view(page)).state.total).toBe("105");
  expect((await view(page)).book?.revisions).toHaveLength(2);
});
test("real progress scenes, privacy, reduced motion, keyboard and responsive themes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = await setup(page);
  await post(page, s.bank, "27000000");
  await post(page, s.bank, "6750000", { fundId: "rainy_day" });
  await post(page, s.bank, "9000000", { fundId: "sinking" });
  await page.reload();
  await expect(
    page.locator('[data-fund="emergency"] .fund-scene'),
  ).toHaveAttribute("data-progress", "0.5");
  await expect(
    page.locator('[data-fund="rainy_day"] .fund-scene'),
  ).toHaveAttribute("data-progress", "0.75");
  await page.screenshot({
    path: `artifacts/funds-light-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator(".fund-workspace")).not.toContainText("27.000.000");
  await expect(page.locator('[data-fund="emergency"]')).toContainText("50,00%");
  await page
    .locator('[data-fund="emergency"]')
    .getByRole("button", { name: "Thêm tiền", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xem trước thay đổi", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hiện tiền trong form", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xem trước thay đổi", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await expect(page.locator(".fund-workspace")).not.toContainText("27.000.000");
  await page.getByRole("button", { name: "Hiện số tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem Emergency Fund", exact: true })
    .click();
  await page.getByRole("tab", { name: "Hướng dẫn", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Lịch sử", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Lịch sử", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/funds-dark-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page
      .locator(".fund-scene")
      .first()
      .evaluate((el) => getComputedStyle(el.querySelector("g")!).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await post(page, s.bank, "81000000");
  await page.reload();
  await expect(
    page.locator('[data-fund="emergency"] .fund-scene'),
  ).toHaveAttribute("data-progress", "1");
  await expect(page.locator('[data-fund="emergency"]')).toContainText(
    "200,00%",
  );
  await expect(page.locator('[data-fund="emergency"]')).toContainText(
    "Vượt mục tiêu",
  );
});
test("fund pages and APIs enforce auth and cookie origin, landing stays illustrative", async ({
  page,
}) => {
  await page.goto("/funds");
  await expect(page).toHaveURL(/\/login\?next=%2Ffunds$/);
  expect((await page.request.get("/api/v1/funds")).status()).toBe(401);
  await login(page);
  expect(
    (
      await page.request.post("/api/v1/funds/commands", {
        headers: { origin: "https://other.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (await page.request.get("/api/v1/funds")).headers()["cache-control"],
  ).toBe("private, no-store");
  const calls: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/v1\/(expenses|income|savings|investments|funds)/.test(r.url()))
      calls.push(r.url());
  });
  await page.goto("/");
  const preview = page.locator(".product-preview");
  await preview.getByRole("tab", { name: "Quỹ an toàn", exact: true }).click();
  await expect(preview.getByRole("tabpanel")).toContainText("42.750.000");
  await expect(preview.locator('[data-scene="emergency"]')).toBeVisible();
  await preview.getByRole("button", { name: "Ẩn số tiền minh họa" }).click();
  await expect(preview.getByRole("tabpanel")).not.toContainText("42.750.000");
  expect(calls).toEqual([]);
});

test("locations archive only at zero; canceled entries remain in history and lists paginate", async ({
  page,
}) => {
  const s = await setup(page);
  await page.getByRole("button", { name: "Nơi giữ tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm nơi giữ tiền", exact: true })
    .click();
  await page
    .getByLabel("Tên nơi giữ tiền", { exact: true })
    .fill("Ví dự phòng");
  await save(page);
  await expect(page.locator("dialog").first()).toContainText("Ví dự phòng");
  await page
    .getByRole("button", { name: "Sửa Ví dự phòng", exact: true })
    .click();
  await page.getByLabel("Đang sử dụng", { exact: true }).uncheck();
  await save(page);
  const parent = page.locator("dialog").first();
  await expect(parent).toContainText("Đã ngừng sử dụng");
  await parent
    .getByRole("button", { name: "Sửa Ví dự phòng", exact: true })
    .click();
  await page.getByLabel("Đang sử dụng", { exact: true }).check();
  await save(page);
  await parent.getByRole("button", { name: "Đóng", exact: true }).click();
  for (let i = 0; i < 21; i++)
    await post(page, s.bank, "1", { note: `Khoản kiểm tra ${i}` });
  await page.reload();
  await expect(page.locator(".fund-transaction")).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator(".fund-transaction")).toHaveCount(1);
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByLabel("Lý do sửa hoặc hủy", { exact: true })
    .fill("Ghi trùng");
  await save(page);
  await expect(page.locator(".fund-pagination")).toContainText("20 giao dịch");
  expect((await view(page)).book?.revisions).toHaveLength(22);
  await page.getByRole("button", { name: "Nơi giữ tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Sửa Ngân hàng", exact: true })
    .click();
  await page.getByLabel("Đang sử dụng", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "bằng 0",
  );
});
test("foreground refresh keeps drafts on network failure and clears data on auth expiry", async ({
  page,
}) => {
  const s = await setup(page);
  await post(page, s.bank, "1234567");
  await page.reload();
  await expect(page.locator(".fund-workspace")).toContainText("1.234.567");
  await page
    .locator('[data-fund="emergency"]')
    .getByRole("button", { name: "Thêm tiền", exact: true })
    .click();
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("500");
  await page.route("**/api/v1/funds", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Mạng kiểm thử tạm gián đoạn" },
    }),
  );
  await page.clock.setFixedTime(Date.now() + 61000);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.locator(".fund-workspace > [role=alert]")).toContainText(
    "Mạng kiểm thử",
  );
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "500",
  );
  await expect(page.locator(".fund-health")).toContainText("1.234.567");
  await expect(page.locator(".fund-workspace > .loading-status")).toHaveCount(
    0,
  );
  await page.unroute("**/api/v1/funds");
  await page.route("**/api/v1/funds", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Phiên đã hết hạn", code: "UNAUTHENTICATED" },
    }),
  );
  await page.context().clearCookies();
  await page.clock.setFixedTime(Date.now() + 80000);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page).toHaveURL(/\/login\?next=%2Ffunds$/);
  await expect(page.locator(".fund-health")).toHaveCount(0);
});
