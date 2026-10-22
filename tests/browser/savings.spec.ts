import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { savingsClock } from "../../src/domain/savings/engine";
import type { SavingsView } from "../../src/domain/savings/types";
const today = savingsClock().today,
  year = Number(today.slice(0, 4)) - 1,
  month = `${year}-12`,
  day = `${month}-01`;
test("login waits for hydration under delayed JavaScript before accepting input", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/login?next=/savings", { waitUntil: "commit" });
    await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Gửi mã đăng nhập", exact: true }),
    ).toBeDisabled();
    await expect(page).toHaveURL(/\/login\?next=\/savings$/);
  } finally {
    release();
  }
  await expect(page.getByLabel("Email", { exact: true })).toBeEnabled();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await expect(page.getByLabel("Mã xác nhận", { exact: true })).toBeVisible();
});
async function login(page: Page) {
  await page.goto("/login?next=/savings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/savings$/);
  await expect(
    page.getByRole("button", { name: "Thêm danh mục", exact: true }),
  ).toBeVisible();
}
async function view(page: Page): Promise<SavingsView> {
  const r = await page.request.get("/api/v1/savings");
  expect(r.ok()).toBe(true);
  return r.json();
}
async function command(page: Page, action: unknown, version?: number) {
  const v = version ?? (await view(page)).book?.version ?? 0;
  return page.request.post("/api/v1/savings/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: { id: randomUUID(), expectedVersion: v, action },
  });
}
async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
async function category(page: Page, name: string, kind = "cash") {
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await page.getByLabel("Tên danh mục", { exact: true }).fill(name);
  await page.getByLabel("Tháng bắt đầu", { exact: true }).fill(month);
  await page.getByLabel("Loại tài sản", { exact: true }).selectOption(kind);
  if (kind === "gold")
    await page.getByLabel("Đơn vị vàng", { exact: true }).selectOption("chỉ");
  await save(page);
}
async function openTx(page: Page, kind: string) {
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await page.getByLabel("Loại giao dịch", { exact: true }).selectOption(kind);
  await page.getByLabel("Ngày giao dịch", { exact: true }).fill(day);
}
test("savings chart tooltips show hovered data, preserve keyboard focus and mask money", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  let cash = "";
  for (const [i, amount] of [
    "6000000",
    "2000000",
    "1000000",
    "500000",
    "300000",
    "200000",
  ].entries()) {
    const id = randomUUID();
    if (!i) cash = id;
    expect(
      (
        await command(page, {
          type: "createCategory",
          id,
          name: `Ví ${i + 1}`,
          kind: "cash",
          start: month,
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await command(page, {
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            kind: "openingCash",
            categoryId: id,
            date: day,
            amount,
          },
        })
      ).ok(),
    ).toBe(true);
  }
  for (const [kind, amount] of [
    ["deposit", "2000000"],
    ["withdraw", "1000000"],
  ]) {
    expect(
      (
        await command(page, {
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            kind,
            categoryId: cash,
            date: day,
            amount,
          },
        })
      ).ok(),
    ).toBe(true);
  }
  await page.reload();
  await page.getByLabel("Tháng đang xem").fill(month);
  const point = page
    .locator(".savings-chart-mark")
    .filter({ has: page.locator(".savings-point") })
    .last();
  const tooltip = page.getByRole("tooltip");
  await expect(point).toHaveAttribute(
    "aria-label",
    new RegExp(`${month}.*11.000.000`),
  );
  if (info.project.use.hasTouch) await point.tap();
  else await point.click();
  await expect(tooltip).toContainText("Tài sản cuối tháng");
  await expect(tooltip).toContainText("11.000.000 ₫");
  await page.locator(".savings-chart-grid").screenshot({
    path: `artifacts/savings-point-tooltip-${info.project.name}.png`,
  });
  expect(await point.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "none",
  );
  expect(await point.boundingBox().then((box) => box!.height)).toBeLessThan(50);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);

  // Real keyboard entry retains a small focus ring around the point.
  await page.getByLabel("Biểu đồ", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".savings-chart-mark").first()).toBeFocused();
  await expect(tooltip).toBeVisible();
  expect(
    await page
      .locator(".savings-chart-mark")
      .first()
      .locator(".savings-point-focus")
      .evaluate((el) => getComputedStyle(el).opacity),
  ).toBe("1");
  await page.keyboard.press("Escape");

  await page.getByLabel("Biểu đồ", { exact: true }).selectOption("flow");
  const inflow = page
    .locator(".savings-chart-mark")
    .filter({ has: page.locator(".savings-point") })
    .last();
  const outflow = page
    .locator(".savings-chart-mark")
    .filter({ has: page.locator(".savings-outflow") })
    .last();
  if (info.project.use.hasTouch) await inflow.tap();
  else await inflow.hover();
  await expect(tooltip).toContainText("Nạp bên ngoài");
  await expect(tooltip).toContainText("2.000.000 ₫");
  await outflow.click();
  await expect(tooltip).toContainText("Rút bên ngoài");
  await expect(tooltip).toContainText("1.000.000 ₫");
  await page.getByLabel("Biểu đồ", { exact: true }).selectOption("assets");
  await expect(tooltip).toHaveCount(0);

  // Hover actual painted arcs; checking every slice also catches SVG hit-test overlap.
  const ring = page.locator(".savings-composition svg");
  await ring.scrollIntoViewIfNeeded();
  const box = (await ring.boundingBox())!;
  const slices = page.locator(".savings-chart-slice");
  let startPercent = 0;
  for (let i = 0; i < (await slices.count()); i++) {
    const slice = slices.nth(i);
    const percent = Number(
      (await slice.getAttribute("stroke-dasharray"))!.split(" ")[0],
    );
    const angle = ((startPercent + percent / 2) * Math.PI) / 50 - Math.PI / 2;
    await page.mouse.move(
      box.x + (box.width * (110 + 80 * Math.cos(angle))) / 220,
      box.y + (box.height * (110 + 80 * Math.sin(angle))) / 220,
    );
    await expect(tooltip).toContainText(
      (await slice.getAttribute("aria-label"))!.split(":")[0],
    );
    startPercent += percent;
  }
  await expect(tooltip).toContainText("Khác");
  await expect(tooltip).toContainText("500.000 ₫");
  await page.locator(".savings-chart-grid").screenshot({
    path: `artifacts/savings-allocation-tooltip-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  // Escape also works after a mouse hover when focus remains elsewhere.
  await expect(tooltip).toHaveCount(0);

  const legend = page.locator(".savings-chart-legend-item").first();
  await legend.click();
  await expect(tooltip).toContainText("Ví 1");
  await expect(tooltip).toContainText("7.000.000 ₫");
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await legend.click();
  await expect(tooltip).toContainText("•••••• ₫");
  await expect(tooltip).not.toContainText("7.000.000");
  await expect(slices.first()).not.toHaveAttribute("aria-label", /7\.000\.000/);
  await expect(tooltip).toContainText("%");
  await page.getByLabel("Phân bố theo", { exact: true }).selectOption("kind");
  await expect(tooltip).toHaveCount(0);
  await page.locator(".savings-chart-legend-item").first().click();
  await expect(tooltip).toContainText("Tiền / ví");
  await expect(tooltip).toContainText("100%");

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.screenshot({
    path: `artifacts/savings-chart-tooltip-${info.project.name}.png`,
    fullPage: true,
  });
  // A full-page Chromium screenshot can resize the viewport and dismiss the tooltip.
  await page.locator(".savings-chart-legend-item").first().click();
  await expect(tooltip).toContainText("100%");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const tooltipBox = (await tooltip.boundingBox())!;
  expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
  expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  for (const width of [320, 844]) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 390 });
    const item = page.locator(".savings-chart-legend-item").first();
    if (info.project.use.hasTouch) await item.tap();
    else await item.click();
    await expect(tooltip).toContainText("100%");
    const bounds = (await tooltip.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 320)
      await page.screenshot({
        path: `artifacts/savings-chart-320-${info.project.name}.png`,
        fullPage: true,
      });
  }

  // Full Reports uses the same interactions, including a future-month placeholder.
  await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
  await page.getByLabel("Từ ngày", { exact: true }).fill(day);
  await page.getByLabel("Đến ngày", { exact: true }).fill(`${year + 2}-01-31`);
  const future = page.locator(".savings-chart-mark").last();
  await future.focus();
  await expect(tooltip).toContainText("Chưa phát sinh");
  await expect(tooltip).not.toContainText("0 ₫");
  expect(errors).toEqual([]);
});
test("savings UI CRUD, gold sale, reports, exports and responsive privacy", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await category(page, "Ví tích lũy");
  await category(page, "Vàng giữ lâu", "gold");
  await page.getByLabel("Tháng đang xem").fill(month);
  await expect(page.locator(".savings-toolbar .pill")).toContainText(
    "Chưa chốt",
  );
  await openTx(page, "openingGold");
  await page.getByLabel("Giá vốn mở đầu (VND)").fill("100000000");
  await page.getByLabel("Số lượng (chỉ)").fill("1");
  await page.getByLabel("Giá bán lại mỗi đơn vị (VND)").fill("100000000");
  await save(page);
  await page
    .getByRole("button", { name: "Chi tiết Vàng giữ lâu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("100.000.000 ₫");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await openTx(page, "sellGold");
  await page.getByLabel("Giá bán lại mỗi đơn vị (VND)").fill("130000000");
  await page.getByLabel("Phí (VND)", { exact: true }).fill("1000000");
  const v = await view(page);
  const cash = v.book!.categories.find((c) => c.kind === "cash")!;
  await page.getByLabel("Ví nhận tiền", { exact: true }).selectOption(cash.id);
  await page.getByLabel("Tổng lượng muốn bán (để gợi ý)").fill("0.5");
  await page
    .getByRole("button", { name: "Gợi ý theo đợt cũ nhất", exact: true })
    .click();
  await expect(page.getByLabel(/Lượng bán đợt/)).toHaveValue("0.5");
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toContainText("14.000.000 ₫");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await view(page)).state.effects.at(-1)?.net).toBe("64000000");
  await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
  await page.getByLabel("Từ ngày", { exact: true }).fill(day);
  await page.getByLabel("Đến ngày", { exact: true }).fill(`${year + 1}-01-31`);
  await expect(
    page.getByRole("region", { name: "Tài sản theo danh mục", exact: true }),
  ).toContainText("114.000.000 ₫");
  await page.getByLabel("Biểu đồ", { exact: true }).selectOption("flow");
  await page.getByLabel("Phân bố theo", { exact: true }).selectOption("kind");
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const csv = await readFile((await (await csvPromise).path())!, "utf8");
  expect(csv).toContain("64000000");
  expect(csv).toContain("50000000");
  await expect(
    page.getByRole("button", { name: "Sao lưu JSON", exact: true }),
  ).toHaveCount(0);
  const backup = await (
    await page.request.get("/api/v1/savings/backup")
  ).json();
  expect(backup.book.revisions).toHaveLength(2);
  await page
    .getByRole("button", { name: "Cập nhật giá vàng", exact: true })
    .click();
  await page.getByLabel("Ngày giá", { exact: true }).fill(day);
  await page
    .getByLabel("Giá bán lại dự kiến (VND/chỉ)", { exact: true })
    .fill("130000000");
  await save(page);
  expect(
    (await view(page)).state.positions.find((p) => p.kind === "gold")?.value,
  ).toBe("65000000");
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator(".savings-table").first()).not.toContainText("0.5");
  await expect(page.locator(".savings-table").first()).not.toContainText(
    "64.000.000",
  );
  await expect(page.locator(".savings-metrics")).toContainText("••••••");
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await expect(
    page.getByLabel("Số tiền (VND)", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hiện tiền trong form", exact: true })
    .click();
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `artifacts/savings-${info.project.name}.png`,
    fullPage: true,
  });
});
test("deposits, atomic rollover, monthly locks, archive and historical reporting", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await category(page, "Tiền mặt");
  await category(page, "Sổ ngân hàng", "deposit");
  const v = await view(page),
    cash = v.book!.categories.find((c) => c.kind === "cash")!,
    bank = v.book!.categories.find((c) => c.kind === "deposit")!,
    contract = randomUUID();
  expect(
    (
      await command(page, {
        type: "postTransaction",
        transaction: {
          id: contract,
          kind: "openingDeposit",
          categoryId: bank.id,
          date: day,
          name: "Sổ một",
          maturity: `${year + 1}-01-01`,
          amount: "100000000",
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await command(page, {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          kind: "rollover",
          categoryId: bank.id,
          date: `${year + 1}-01-01`,
          contractId: contract,
          name: "Sổ hai",
          maturity: today,
          interest: "1000000",
          reinvestInterest: "500000",
          cashCategoryId: cash.id,
        },
      })
    ).ok(),
  ).toBe(true);
  expect((await command(page, { type: "closeMonth", month })).ok()).toBe(true);
  const locked = await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      categoryId: cash.id,
      date: day,
      amount: "1",
    },
  });
  expect(locked.status()).toBe(409);
  await page.getByLabel("Tháng đang xem").fill(month);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mở lại tháng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mở lại tháng", exact: true }).click();
  await page.getByLabel("Lý do thay đổi").fill("Đối soát lại");
  await save(page);
  await page.getByRole("tab", { name: "Danh mục", exact: true }).click();
  await page
    .getByRole("button", { name: "Lưu trữ Sổ ngân hàng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("hết tài sản");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  const report = await page.request.get(
    `/api/v1/savings/reports?from=${day}&to=${today}`,
  );
  expect(report.ok()).toBe(true);
  expect((await report.json()).after.total).toBe("101000000");
});
test("savings API auth, invalid input, origin, private responses and draft recovery", async ({
  page,
}) => {
  test.setTimeout(120000);
  expect((await page.request.get("/api/v1/savings")).status()).toBe(401);
  await login(page);
  await category(page, "Ví kiểm thử");
  const v = await view(page),
    id = v.book!.categories[0].id;
  const invalid = await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      categoryId: id,
      date: "2027-02-30",
      amount: "1",
    },
  });
  expect(invalid.status()).toBe(422);
  const wrong = await page.request.post("/api/v1/savings/commands", {
    headers: { origin: "https://other.example" },
    data: {},
  });
  expect(wrong.status()).toBe(403);
  expect(
    (await page.request.get("/api/v1/savings")).headers()["cache-control"],
  ).toBe("private, no-store");
  await openTx(page, "deposit");
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("12345");
  await page.route("**/api/v1/savings/preview", (r) => r.abort());
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("Mất kết nối");
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "12345",
  );
  await page.unroute("**/api/v1/savings/preview");
  expect(
    (
      await command(page, {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          kind: "deposit",
          categoryId: id,
          date: day,
          amount: "1",
        },
      })
    ).ok(),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Tải dữ liệu mới, giữ nội dung nhập",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Tải dữ liệu mới, giữ nội dung nhập",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "12345",
  );
  await save(page);
  expect((await view(page)).state.total).toBe("12346");
});

test("lost commit response retries once; empty categories archive and restore with effective names", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await category(page, "Ví gốc");
  await openTx(page, "deposit");
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  let lost = false;
  await page.route("**/api/v1/savings/commands", async (route) => {
    const response = await route.fetch();
    if (!lost) {
      lost = true;
      await route.abort("failed");
    } else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("Mất kết nối");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.unroute("**/api/v1/savings/commands");
  let v = await view(page);
  expect(v.state.total).toBe("100");
  expect(v.book!.revisions).toHaveLength(1);
  expect(
    (
      await command(page, {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          kind: "withdraw",
          categoryId: v.book!.categories[0].id,
          date: day,
          amount: "100",
        },
      })
    ).ok(),
  ).toBe(true);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await page.getByRole("tab", { name: "Danh mục", exact: true }).click();
  await page
    .getByRole("button", { name: "Lưu trữ Ví gốc", exact: true })
    .click();
  await page.getByLabel("Tháng hiệu lực").fill(today.slice(0, 7));
  await save(page);
  await expect(
    page.getByRole("button", { name: "Khôi phục Ví gốc", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Khôi phục Ví gốc", exact: true })
    .click();
  await save(page);
  await page
    .getByRole("button", { name: "Sửa danh mục Ví gốc", exact: true })
    .click();
  await page.getByLabel("Tên danh mục", { exact: true }).fill("Ví đổi tên");
  await save(page);
  await expect(
    page.getByRole("heading", { name: "🌱 Ví đổi tên", exact: true }),
  ).toBeVisible();
  v = await view(page);
  expect(v.book!.revisions).toHaveLength(2);
  const history = await page.request.get(`/api/v1/savings?month=${month}`);
  expect((await history.json()).state.positions[0].name).toBe("Ví gốc");
});
