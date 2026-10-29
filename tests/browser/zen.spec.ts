import { completeTestEmailLogin } from "./helpers/test-email-login";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
import type { ExpenseView } from "../../src/domain/expenses/types";
import type { ExpenseAction } from "../../src/domain/expenses/schema";
const current = vietnamClock().today.slice(0, 7);
const amount = "1234567";
const formatted = "1.234.567 ₫";
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
  const v = await view(page);
  const response = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(response.ok()).toBe(true);
}
async function setup(page: Page) {
  const address = `${randomUUID()}@example.test`;
  await login(page, address);
  await command(page, { type: "initialize", start: current });
  await command(page, {
    type: "upsertLabel",
    id: randomUUID(),
    kind: "method",
    name: "Ví",
  });
  const id = randomUUID();
  await command(page, {
    type: "createJar",
    id,
    kind: "monthly",
    start: current,
    opening: "0",
    name: "Ăn uống riêng tư",
    description: "",
    method: "Ví",
    group: "Sinh hoạt",
    amount,
    emoji: "🍜",
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Ăn uống riêng tư", exact: true }),
  ).toBeVisible();
  return { address, id };
}
async function confirm(page: Page) {
  const titleId = await page
    .getByRole("dialog")
    .getAttribute("aria-labelledby");
  const editor = page.locator(`dialog[aria-labelledby="${titleId}"]`);
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(editor).toBeHidden();
}

test("privacy persists without flashing and scopes form disclosure, charts and income", async ({
  page,
}) => {
  await setup(page);
  await expect(page.locator("main")).toContainText(formatted);
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator("main")).not.toContainText(formatted);
  await page
    .getByRole("button", { name: "Ăn uống riêng tư", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText(formatted);
  await page.getByRole("button", { name: "Sửa hũ / mức mặc định" }).click();
  const input = page.getByLabel("Mức mặc định mỗi tháng", { exact: true });
  await expect(input).toHaveValue("••••••");
  await expect(
    page.getByRole("button", { name: "Xem trước thay đổi" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hiện tiền trong cửa sổ này" })
    .click();
  await expect(input).toHaveValue(amount);
  await input.fill("1234568");
  await page.getByRole("button", { name: "Xem trước thay đổi" }).click();
  await expect(page.locator(".expense-preview")).toContainText(formatted);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(input).toHaveValue("••••••");
  await expect(page.locator(".expense-preview")).not.toContainText(formatted);
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  // Canceling the editor returns to its detail dialog.
  await expect(
    page.getByRole("dialog", { name: "Ăn uống riêng tư", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Báo cáo năm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Biểu đồ", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Góc nhìn").selectOption("groups");
  await expect(page.locator(".chart-tooltip")).not.toContainText(formatted);
  await expect(page.locator(".chart-legend")).toContainText("100%");
  await page.getByLabel("Góc nhìn").selectOption("trend");
  await expect(page.getByRole("img", { name: /Diễn biến tiền/ })).toBeVisible();
  await page
    .getByRole("button", {
      name: `Tháng ${Number(current.slice(5))}`,
      exact: true,
    })
    .focus();
  await expect(page.locator(".chart-tooltip")).not.toContainText(formatted);
  await page.getByRole("button", { name: "Bảng", exact: true }).click();
  await expect(page.locator(".expense-report")).not.toContainText(formatted);
  await page.goto("/overview");
  await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  await expect(page.locator("main")).not.toContainText(formatted);
  expect(await page.locator("body").ariaSnapshot()).not.toContain(formatted);
  await page.addInitScript(() => {
    const tracked = window as unknown as { moneyFlashed: boolean };
    tracked.moneyFlashed = false;
    new MutationObserver(() => {
      if (document.querySelector("main")?.textContent?.includes("1.234.567 ₫"))
        tracked.moneyFlashed = true;
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  await page.reload();
  await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { moneyFlashed: boolean }).moneyFlashed,
    ),
  ).toBe(false);
  // Income is an existing working module; the same privacy preference covers it.
  const income = await page.request.get(
    `/api/v1/income?year=${current.slice(0, 4)}`,
  );
  const incomeView = await income.json();
  const response = await page.request.post("/api/v1/income/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: incomeView.book?.version ?? 0,
      action: {
        type: "upsertOneOff",
        id: randomUUID(),
        month: current,
        name: "Thu riêng",
        description: "",
        amount,
      },
    },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/income");
  await expect(page.locator("main")).toContainText("Thu riêng");
  await expect(page.locator("main")).not.toContainText(formatted);
  await page
    .getByRole("button", { name: "Sửa Thu riêng", exact: true })
    .click();
  await expect(page.getByLabel("Số tiền thực nhận (VND)")).toHaveValue(
    "••••••",
  );
  await page
    .getByRole("button", { name: "Hiện tiền trong cửa sổ này" })
    .focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Số tiền thực nhận (VND)")).toHaveValue(amount);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.getByLabel("Số tiền thực nhận (VND)")).toHaveValue(
    "••••••",
  );
  await page.keyboard.press("Escape");
});

test("emoji picker saves through commands and a separate session without changing money", async ({
  page,
  browser,
}) => {
  const { address } = await setup(page);
  const before = await view(page);
  await page
    .getByRole("button", { name: "Ăn uống riêng tư", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đổi biểu tượng", exact: true })
    .click();
  await page.getByRole("button", { name: "Quà tặng", exact: true }).click();
  await confirm(page);
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Ăn uống riêng tư",
  );
  await page.keyboard.press("Escape");
  const after = await view(page);
  expect(after.book?.inputs).toEqual(before.book?.inputs);
  expect(after.rows.map(({ emoji: _emoji, ...r }) => r)).toEqual(
    before.rows.map(({ emoji: _emoji, ...r }) => r),
  );
  await expect(
    page.getByRole("button", { name: "Ăn uống riêng tư", exact: true }),
  ).toContainText("🎁");
  const context = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  try {
    const second = await context.newPage();
    await login(second, address);
    await expect(
      second.getByRole("button", { name: "Ăn uống riêng tư", exact: true }),
    ).toContainText("🎁");
  } finally {
    await context.close();
  }
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  await page.getByLabel("Tên hũ", { exact: true }).fill("Nhà ở mới");
  await expect(
    page.getByRole("button", { name: "Tự động theo tên" }),
  ).toContainText("🏡");
  await page.getByRole("button", { name: "Cà phê", exact: true }).click();
  await page
    .getByLabel("Phương thức", { exact: true })
    .last()
    .selectOption("Ví");
  await page.getByLabel("Mức mặc định mỗi tháng").fill("200000");
  await confirm(page);
  await expect(
    page.getByRole("button", { name: "Nhà ở mới", exact: true }),
  ).toContainText("☕");
});

test("Zen surfaces, charts and forms adapt to themes, mobile, keyboard and zoom", async ({
  page,
}, info) => {
  await setup(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    for (const route of ["/overview", "/budgets", "/income", "/goals"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`zen-${route.slice(1)}-${scheme}.png`),
        fullPage: true,
      });
    }
    const contrast = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (hex: string) => {
        const rgb = hex
          .trim()
          .replace("#", "")
          .match(/.{2}/g)!
          .map((v) => parseInt(v, 16) / 255)
          .map((v) =>
            v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      return [
        ["--text", "--surface"],
        ["--muted", "--canvas"],
        ["--primary", "--primary-soft"],
        ["--on-primary", "--primary"],
        ["--accent", "--accent-soft"],
      ].map(([a, b]) => {
        const x = luminance(style.getPropertyValue(a)),
          y = luminance(style.getPropertyValue(b));
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      });
    });
    expect(
      contrast.every((r) => r >= 4.5),
      JSON.stringify(contrast),
    ).toBe(true);
  }
  if (info.project.name === "desktop") {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/overview");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });
  }
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Hiện số tiền", exact: true }),
  ).toBeFocused();
});

test("overview distinguishes auth, missing data and retry; privacy works with blocked storage", async ({
  page,
}) => {
  await setup(page);
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 401,
      json: { code: "UNAUTHENTICATED", error: "Phiên hết hạn" },
    }),
  );
  await page.goto("/overview");
  await expect(
    page.locator("main").getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-widget="expenses"] dl')).toHaveCount(0);
  await page.unroute(/\/api\/v1\/overview(?:\?.*)?$/);
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, (route) =>
    route.abort("failed"),
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Thử tải lại" })).toBeVisible();
  await page.unroute(/\/api\/v1\/overview(?:\?.*)?$/);
  await page.getByRole("button", { name: "Thử tải lại" }).click();
  await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        layout: {
          schemaVersion: 1,
          widgets: ["expenses"],
          jarIds: [],
          revision: 0,
        },
        today: `${current}-15`,
        fetchedAt: new Date().toISOString(),
        sources: {
          expenses: {
            status: "ready",
            data: { empty: true, total: null, jars: [], groups: [], over: 0 },
          },
        },
      },
    }),
  );
  await page.reload();
  await expect(
    page
      .locator('[data-widget="expenses"]')
      .getByText("Chưa có dữ liệu. Mở module để bắt đầu ghi nhận."),
  ).toBeVisible();
  await page.unroute(/\/api\/v1\/overview(?:\?.*)?$/);
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "fm-privacy") throw new Error("Storage unavailable");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "fm-privacy") throw new Error("Storage unavailable");
      return set.call(this, key, value);
    };
  });
  await page.reload();
  await expect(page.locator("main")).toContainText(formatted);
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator("main")).not.toContainText(formatted);
  await page.getByRole("button", { name: "Hiện số tiền", exact: true }).click();
  await expect(page.locator("main")).toContainText(formatted);
});

test("keyboard emoji validates, survives reload and backup, and new Vietnamese brands can be saved", async ({
  page,
}, info) => {
  const { id } = await setup(page);
  const before = await view(page);
  await page
    .getByRole("button", { name: "Ăn uống riêng tư", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đổi biểu tượng", exact: true })
    .click();
  const input = page.getByLabel("Emoji từ bàn phím", { exact: true });
  const search = page.getByLabel("Tìm biểu tượng", { exact: true });
  await search.fill("dau tu");
  await expect(
    page
      .locator(".emoji-options")
      .getByRole("button", { name: "Đầu tư", exact: true }),
  ).toHaveCount(1);
  await search.fill("khong-co-bieu-tuong-nay");
  await expect(
    page.getByText(
      "Không tìm thấy biểu tượng. Bạn có thể nhập emoji từ bàn phím.",
      { exact: true },
    ),
  ).toBeVisible();
  await search.fill("");
  await expect(page.locator(".emoji-options button")).toHaveCount(90);
  await input.fill("🦋");
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toBeVisible();
  await input.fill("🦋🌱");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(input).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toHaveCount(0);
  await input.fill("🫶🏽");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({ path: info.outputPath("custom-emoji-320.png") });
  await confirm(page);
  await page.keyboard.press("Escape");
  await page.reload();
  const after = await view(page);
  expect(after.rows.find((row) => row.jarId === id)?.emoji).toBe("🫶🏽");
  expect(after.rows.map(({ emoji: _emoji, ...row }) => row)).toEqual(
    before.rows.map(({ emoji: _emoji, ...row }) => row),
  );
  expect(after.book?.inputs).toEqual(before.book?.inputs);
  await expect(
    page.getByRole("button", { name: "Ăn uống riêng tư", exact: true }),
  ).toContainText("🫶🏽");
  const backupResponse = await page.request.get("/api/v1/data/backup");
  expect(backupResponse.ok()).toBe(true);
  const backup = await backupResponse.json();
  expect(
    backup.tables.expense_jars
      .find((jar: { id: string }) => jar.id === id)
      .rules.at(-1).emoji,
  ).toBe("🫶🏽");
  await page.getByRole("button", { name: "Phân loại", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm phân loại", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Phương thức và nhóm",
    exact: true,
  });
  const brands = editor.getByLabel("Thương hiệu", { exact: true });
  await expect(brands.locator("option")).toHaveCount(28);
  for (const key of [
    "agribank",
    "sacombank",
    "tpbank",
    "shb",
    "hdbank",
    "msb",
    "ocb",
    "seabank",
    "eximbank",
    "lpbank",
    "woori",
    "vnpay",
    "viettelmoney",
    "vnptmoney",
  ]) {
    await brands.selectOption(key);
    const image = editor.locator(".label-visual img");
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await editor.getByLabel("Tên", { exact: true }).fill("Viettel Money");
  await brands.selectOption("viettelmoney");
  await confirm(page);
  const saved = await view(page);
  expect(
    saved.book?.labels.find((label) => label.name === "Viettel Money")
      ?.brandKey,
  ).toBe("viettelmoney");
  await expect(
    page
      .getByRole("dialog", { name: "Phương thức và nhóm", exact: true })
      .locator(".expense-label-row")
      .filter({ hasText: "Viettel Money" })
      .locator("img"),
  ).toHaveAttribute("src", "/brands/viettelmoney.png");
});
