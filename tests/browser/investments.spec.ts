import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { investmentClock } from "../../src/domain/investments/engine";
import type { InvestmentView } from "../../src/domain/investments/types";
import { buildInvestmentReviewData } from "../../scripts/lib/investment-review-data.mjs";
import { readFile } from "node:fs/promises";
const today = investmentClock().today,
  start = `${Number(today.slice(0, 4)) - 1}-12-01`;
async function login(page: Page) {
  await page.goto("/login?next=/investments");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/investments$/);
  await expect(
    page.getByRole("button", { name: "Thêm danh mục", exact: true }),
  ).toBeEnabled();
}
async function view(page: Page): Promise<InvestmentView> {
  const r = await page.request.get("/api/v1/investments");
  expect(r.ok()).toBe(true);
  return r.json();
}
async function command(page: Page, action: unknown) {
  const v = await view(page);
  const r = await page.request.post("/api/v1/investments/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r;
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
async function category(page: Page, name: string, kind = "investment") {
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await page.getByLabel("Tên danh mục", { exact: true }).fill(name);
  await page
    .getByRole("combobox", { name: "Loại danh mục", exact: true })
    .selectOption(kind);
  await page.getByLabel("Ngày bắt đầu", { exact: true }).fill(start);
  await save(page);
  return (await view(page)).book!.categories.find(
    (c) => c.rules[0].name === name,
  )!.id;
}
async function begin(page: Page, kind: string, id: string) {
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Loại giao dịch", exact: true })
    .selectOption(kind);
  await page.getByLabel("Ngày giao dịch", { exact: true }).fill(start);
  await page
    .getByRole("combobox", { name: "Danh mục / ví", exact: true })
    .selectOption(id);
}
async function fixture(page: Page) {
  const data = buildInvestmentReviewData({ ownerId: randomUUID(), today });
  for (const a of data.actions) await command(page, a);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Danh mục", exact: true }),
  ).toBeVisible();
  return data;
}
test("complete aggregate investing flow, reports, downloads and responsive light/dark", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const cash = await category(page, "Tiền chờ kiểm thử", "cash"),
    asset = await category(page, "Cổ phiếu kiểm thử");
  await begin(page, "openingCash", cash);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("20000000");
  await save(page);
  await begin(page, "openingInvestment", asset);
  await page
    .getByLabel("Giá vốn mở đầu (VND)", { exact: true })
    .fill("100000000");
  await page
    .getByLabel("Giá trị định giá (VND)", { exact: true })
    .fill("110000000");
  await save(page);
  await begin(page, "buy", asset);
  await page
    .getByLabel("Tiền mua trước phí/thuế (VND)", { exact: true })
    .fill("10000000");
  await page.getByLabel("Phí (VND)", { exact: true }).fill("10000");
  await page
    .getByRole("combobox", { name: "Nguồn tiền", exact: true })
    .selectOption(cash);
  await page
    .getByLabel("Giá trị tài sản còn giữ sau giao dịch (VND)", { exact: true })
    .fill("120000000");
  await save(page);
  await begin(page, "sell", asset);
  await page
    .getByLabel("Tiền bán trước phí/thuế (VND)", { exact: true })
    .fill("30000000");
  await page
    .getByLabel("Giá vốn phần đã bán (VND)", { exact: true })
    .fill("25000000");
  await page.getByLabel("Phí (VND)", { exact: true }).fill("100000");
  await page.getByLabel("Thuế (VND)", { exact: true }).fill("100000");
  await page
    .getByRole("combobox", { name: "Nơi nhận tiền", exact: true })
    .selectOption(cash);
  await page
    .getByLabel("Giá trị tài sản còn giữ sau giao dịch (VND)", { exact: true })
    .fill("95000000");
  await save(page);
  let v = await view(page);
  expect(v.state.positions.find((p) => p.id === asset)).toMatchObject({
    cost: "85010000",
    value: "95000000",
    realized: "4800000",
  });
  expect(v.state.positions.find((p) => p.id === cash)?.cash).toBe("39790000");
  await expect(page.locator(".investment-workspace")).toContainText(
    "4.800.000",
  );
  await page.screenshot({
    path: `artifacts/investments-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.screenshot({
    path: `artifacts/investments-${info.project.name}-dark.png`,
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Loại giao dịch lọc", exact: true })
    .selectOption("sell");
  await page.getByRole("button", { name: /Xem giao dịch/ }).click();
  await expect(page.getByRole("dialog")).toContainText("29.800.000");
  await expect(page.getByRole("dialog")).toContainText("4.800.000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Kỳ báo cáo", exact: true })
    .selectOption("custom");
  await page.getByLabel("Từ ngày", { exact: true }).fill(start);
  await expect(
    page.getByRole("heading", { name: "Diễn biến theo tháng", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/investments-reports-${info.project.name}.png`,
    fullPage: true,
  });
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const csv = await csvPromise;
  expect(await readFile((await csv.path())!, "utf8")).toContain("4800000");
  await page.getByRole("tab", { name: "Quản lý", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tải backup JSON", exact: true }),
  ).toHaveCount(0);
  const data = await (
    await page.request.get("/api/v1/investments/backup")
  ).json();
  expect(data.schemaVersion).toBe(1);
  expect(data.book.revisions).toHaveLength(4);
  expect(errors).toEqual([]);
});
test("archive guard, sell all, restore and valuation correction history", async ({
  page,
}) => {
  await login(page);
  const asset = await category(page, "Crypto kiểm thử");
  await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "openingInvestment",
      date: start,
      categoryId: asset,
      cost: "1000000",
      value: "0",
    },
  });
  await page.reload();
  await page.getByRole("tab", { name: "Quản lý", exact: true }).click();
  await page
    .getByRole("button", { name: /Xóa \/ lưu trữ Crypto kiểm thử/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "hết giá vốn",
  );
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Đóng form", exact: true }).click();
  await begin(page, "sell", asset);
  await page
    .getByLabel("Tiền bán trước phí/thuế (VND)", { exact: true })
    .fill("0");
  await page
    .getByRole("button", {
      name: "Bán hết: lấy toàn bộ vốn, giá trị còn lại 0",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Giá vốn phần đã bán (VND)", { exact: true }),
  ).toHaveValue("1000000");
  await save(page);
  await page.getByRole("tab", { name: "Quản lý", exact: true }).click();
  await page
    .getByRole("button", { name: /Xóa \/ lưu trữ Crypto kiểm thử/ })
    .click();
  await save(page);
  await page.getByRole("button", { name: /Khôi phục Crypto kiểm thử/ }).click();
  await save(page);
  await begin(page, "valuation", asset);
  await page.getByLabel("Ngày giao dịch", { exact: true }).fill(today);
  await page.getByLabel("Giá trị định giá (VND)", { exact: true }).fill("100");
  await save(page);
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Loại giao dịch lọc", exact: true })
    .selectOption("valuation");
  await page.getByRole("button", { name: /Xem giao dịch/ }).click();
  await page
    .getByRole("button", { name: "Sửa giao dịch", exact: true })
    .click();
  await page.getByLabel("Giá trị định giá (VND)", { exact: true }).fill("200");
  await page
    .getByLabel("Lý do sửa / hủy", { exact: true })
    .fill("Đối soát giá trị");
  await save(page);
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Chi tiết giao dịch",
  );
  await page.getByRole("tab", { name: /Lịch sử chỉnh sửa/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Đối soát giá trị");
  expect(
    (await view(page)).book!.revisions.filter(
      (r) => r.transaction?.kind === "valuation",
    ),
  ).toHaveLength(2);
});
test("network retry, concurrent version conflict, and lost post-commit response do not lose drafts or duplicate writes", async ({
  page,
}) => {
  await login(page);
  const cash = await category(page, "Ví retry", "cash");
  await begin(page, "deposit", cash);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("100");
  await page.route("**/api/v1/investments/preview", (route) => route.abort(), {
    times: 1,
  });
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Mất kết nối",
  );
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "100",
  );
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      date: start,
      categoryId: cash,
      amount: "5",
    },
  });
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
    "**/api/v1/investments/commands",
    async (route) => {
      await route.fetch();
      await route.abort();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(
    page.getByText("Chưa xác nhận kết quả lưu.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Số tiền (VND)", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    (await view(page)).state.positions.find((p) => p.id === cash)?.cash,
  ).toBe("105");
  expect((await view(page)).book?.revisions).toHaveLength(2);
});
test("sample portfolio, privacy scope, cross-year reports and full exports", async ({
  page,
}, info) => {
  await login(page);
  const sample = await fixture(page);
  await expect(page.locator(".investment-workspace")).toContainText(
    "49.090.000",
  );
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator(".investment-workspace")).not.toContainText(
    "49.090.000",
  );
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Xem trước thay đổi", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hiện tiền trong form", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Xem trước thay đổi", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await expect(page.locator(".investment-workspace")).not.toContainText(
    "49.090.000",
  );
  await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
  await page.getByLabel("Từ ngày", { exact: true }).fill(start);
  await expect(
    page.getByRole("heading", { name: "Bảng diễn biến", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tabpanel")).not.toContainText("49.090.000");
  await page.getByRole("tab", { name: "Danh mục", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Quản lý", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Quản lý", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Tải backup JSON", exact: true }),
  ).toHaveCount(0);
  const data = await (
    await page.request.get("/api/v1/investments/backup")
  ).json();
  expect(data.book.categories).toHaveLength(7);
  expect(
    data.book.revisions.find(
      (r: { transaction?: { categoryId: string; amount?: string } }) =>
        r.transaction?.categoryId === sample.ids.cash &&
        r.transaction.amount === "20000000",
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Hiện số tiền", exact: true }).click();
  await page.getByRole("tab", { name: "Danh mục", exact: true }).click();
  await page.screenshot({
    path: `artifacts/investments-sample-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("investments page and API enforce auth and cookie origin", async ({
  page,
}) => {
  await page.goto("/investments");
  await expect(page).toHaveURL(/\/login\?next=%2Finvestments$/);
  expect((await page.request.get("/api/v1/investments")).status()).toBe(401);
  await login(page);
  const r = await page.request.post("/api/v1/investments/commands", {
    headers: { origin: "https://foreign.example" },
    data: {},
  });
  expect(r.status()).toBe(403);
  expect(
    (await page.request.get("/api/v1/investments/backup")).headers()[
      "cache-control"
    ],
  ).toBe("private, no-store");
});
