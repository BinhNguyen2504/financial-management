import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { completeTestEmailLogin } from "./helpers/test-email-login";
import {
  buildReviewData,
  buildReviewSQL,
} from "../../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "../../scripts/lib/savings-review-data.mjs";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
} from "../../scripts/lib/investment-cloud-review.mjs";
import {
  buildFundReviewData,
  buildFundReviewSQL,
} from "../../scripts/lib/fund-review-data";
import { widgetIds, defaultLayout } from "../../src/domain/overview/layout";
import {
  expenseSummary,
  incomeSummary,
  savingsSummary,
  investmentSummary,
  fundSummary,
} from "../../src/domain/overview/summary";

async function login(page: Page, seed = false) {
  const email = `${randomUUID()}@example.test`;
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/overview");
  await completeTestEmailLogin(page, email);
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
  if (seed) {
    const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
    try {
      const data = addInvestmentReviewData(
        addSavingsReviewData(buildReviewData({ ownerId: owner })),
      );
      await admin.unsafe(buildReviewSQL(data).seed);
      await admin.unsafe(buildSavingsReviewSQL(data).seed);
      await admin.unsafe(buildInvestmentCloudReviewSQL(data).seed);
      await admin.unsafe(buildFundReviewSQL(buildFundReviewData(data)).seed);
    } finally {
      await admin.end();
    }
    await page.reload();
    await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  }
  return { email, owner };
}
async function layout(page: Page) {
  const r = await page.request.get("/api/v1/overview/layout");
  expect(r.ok()).toBe(true);
  return r.json();
}
async function save(
  page: Page,
  widgets: readonly string[],
  jarIds: string[] = [],
) {
  const previous = await layout(page);
  const r = await page.request.put("/api/v1/overview/layout", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      schemaVersion: 1,
      widgets,
      jarIds,
      expectedRevision: previous.revision,
    },
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("five defaults match all five source modules; reads do not create preferences or expose books", async ({
  page,
}) => {
  const anon = await page.request.get("/api/v1/overview");
  expect(anon.status()).toBe(401);
  await login(page, true);
  await expect(page.locator("[data-widget]")).toHaveCount(5);
  expect((await layout(page)).revision).toBe(0);
  const r = await page.request.get("/api/v1/overview"),
    summary = await r.json();
  expect(r.headers()["cache-control"]).toContain("no-store");
  expect(JSON.stringify(summary)).not.toContain('"book"');
  expect(JSON.stringify(summary)).not.toContain('"audit"');
  const readers = {
    expenses: expenseSummary,
    income: incomeSummary,
    savings: savingsSummary,
    investments: investmentSummary,
    funds: fundSummary,
  };
  for (const [key, reader] of Object.entries(readers)) {
    const view = await (await page.request.get(`/api/v1/${key}`)).json();
    expect(summary.sources[key]).toEqual({
      status: "ready",
      data:
        key === "expenses"
          ? expenseSummary(view, defaultLayout().widgets)
          : key === "savings"
            ? savingsSummary(view, defaultLayout().widgets)
            : reader(view),
    });
  }
  const empty = await (
    await page.request.get("/api/v1/overview?widgets=peace")
  ).json();
  expect(empty.sources).toEqual({});
  const invalid = await page.request.get("/api/v1/overview?widgets=networth");
  expect(invalid.status()).toBe(422);
});

test("preview, cancel, keyboard reorder, watched jars, empty layout and defaults persist per account", async ({
  page,
  browser,
}) => {
  const { email } = await login(page, true);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-widget-option]")).toHaveCount(10);
  await dialog.locator('[data-widget-option="jars"] > label input').check();
  const choices = dialog.locator(".overview-jar-options input");
  await expect(choices).toHaveCount(18);
  for (let i = 0; i < 5; i++) await choices.nth(i).check();
  await expect(choices.nth(5)).toBeDisabled();
  await dialog.locator('[data-widget-option="peace"] > label input').check();
  await dialog
    .getByRole("button", { name: "Chuyển Chi tiêu tháng này lên", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator("[data-widget-option]").first()).toHaveAttribute(
    "data-widget-option",
    "expenses",
  );
  await dialog
    .getByRole("button", { name: "Xem thử bố cục", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-widget="jars"] li')).toHaveCount(5);
  expect((await layout(page)).revision).toBe(0);
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.locator('[data-widget="jars"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  await dialog.locator('[data-widget-option="peace"] > label input').check();
  await dialog
    .getByRole("button", { name: "Chuyển Chi tiêu tháng này lên", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-widget]").first()).toHaveAttribute(
    "data-widget",
    "expenses",
  );
  await expect(page.locator('[data-widget="peace"]')).toBeVisible();
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto(process.env.TEST_BASE_URL! + "/login?next=/overview");
    await completeTestEmailLogin(other, email);
    await expect(other.locator('[data-widget="peace"]')).toBeVisible();
    await expect(other.locator("[data-widget]").first()).toHaveAttribute(
      "data-widget",
      "expenses",
    );
  } finally {
    await context.close();
  }
  await save(page, []);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tổng quan theo cách của bạn" }),
  ).toBeVisible();
  await page.locator(".overview-empty-layout button").click();
  await dialog
    .getByRole("button", { name: "Khôi phục mặc định", exact: true })
    .click();
  expect((await layout(page)).widgets).toEqual([]);
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.locator("[data-widget]")).toHaveCount(5);
  expect((await layout(page)).widgets).toEqual(defaultLayout().widgets);
});

test("save failure retains draft and version conflicts require loading latest", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.locator('[data-widget-option="peace"] input').check();
  await page.route("**/api/v1/overview/layout", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 503,
          json: {
            error: "Chưa lưu được bố cục. Hãy thử lại.",
            code: "STORAGE_UNAVAILABLE",
          },
        })
      : route.continue(),
  );
  await d.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await expect(d.locator('[data-widget-option="peace"] input')).toBeChecked();
  await page.unroute("**/api/v1/overview/layout");
  await save(page, ["income"]);
  await d.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("thiết bị khác");
  await expect(
    d.getByRole("button", { name: "Lưu", exact: true }),
  ).toBeDisabled();
  await d.getByRole("button", { name: "Tải bố cục mới", exact: true }).click();
  await expect(
    d.locator('[data-widget-option="peace"] input'),
  ).not.toBeChecked();
  await expect(
    d.getByRole("button", { name: "Lưu", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true }),
  ).toBeFocused();
});

test("partial source failure preserves successful widgets and labels retained figures; auth clears them", async ({
  page,
}) => {
  await login(page, true);
  const baseline = await (await page.request.get("/api/v1/overview")).json();
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, async (route) => {
    const data = structuredClone(baseline);
    data.sources.income = { status: "error" };
    await route.fulfill({ json: data });
  });
  await page.clock.setFixedTime(
    (await page.evaluate(() => Date.now())) + 61000,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator('[data-widget="income"]')).toContainText(
    "số liệu lần tải trước",
  );
  await expect(page.locator('[data-widget="expenses"] dl')).toBeAttached();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator('[data-widget="income"]')).toContainText(
    "Chưa tải được nguồn",
  );
  await expect(page.locator('[data-widget="savings"] dl')).toBeVisible();
  await page.unroute(/\/api\/v1\/overview(?:\?.*)?$/);
  await page
    .locator('[data-widget="income"]')
    .getByRole("button", { name: "Thử tải lại" })
    .click();
  await expect(page.locator('[data-widget="income"] dl')).toBeVisible();
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, (r) =>
    r.fulfill({
      status: 401,
      json: { code: "UNAUTHENTICATED", error: "Phiên hết hạn" },
    }),
  );
  await page.clock.setFixedTime(
    (await page.evaluate(() => Date.now())) + 61000,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".overview-widget dl")).toHaveCount(0);
  await expect(
    page.locator("main").getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});

test("all ten widgets fit small screens, themes, privacy and English without page errors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, true);
  const data = await (
    await page.request.get(`/api/v1/overview?widgets=${widgetIds.join(",")}`)
  ).json();
  const ids = data.sources.expenses.data.jars
    .slice(0, 5)
    .map((j: { jarId: string }) => j.jarId);
  await save(page, widgetIds, ids);
  await page.reload();
  await expect(page.locator("[data-widget]")).toHaveCount(10);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dark of [false, true]) {
      await page.evaluate(
        ({ dark }) =>
          (document.documentElement.dataset.theme = dark ? "dark" : "light"),
        { dark },
      );
      await fits(page);
    }
  }
  for (const theme of ["forest", "water", "gold", "fire", "earth"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.visualTheme = theme),
      theme,
    );
    await fits(page);
  }
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  const snapshot = await page.locator("main").ariaSnapshot();
  expect(snapshot).not.toMatch(/\d[.,]\d{3}[.,]\d{3} ₫/);
  await expect(page.locator("main")).toContainText("•••••• ₫");
  await page.setViewportSize({ width: 320, height: 780 });
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await expect(d).toBeVisible();
  const box = await d.boundingBox();
  expect(box!.width).toBeCloseTo(320, 0);
  expect(box!.x).toBeCloseTo(0, 0);
  expect(box!.height).toBeCloseTo(780, 0);
  expect(box!.height).toBeLessThanOrEqual(781);
  await page.screenshot({ path: info.outputPath("customize-320.png") });
  await page.keyboard.press("Escape");
  await expect(page.locator(".overview-refresh")).toHaveCount(0);
  await page.goto("/settings");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await page.goto("/overview");
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Overview",
  );
  await expect(page.locator('[data-widget="income"]')).toContainText(
    "Income this month",
  );
  await fits(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("overview-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: info.outputPath("overview-desktop.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

for (const widgets of [
  [],
  ["income", "peace"],
  [
    "attention",
    "income",
    "expenses",
    "savings",
    "investments",
    "funds",
    "allocation",
    "peace",
  ],
] as const) {
  test(`initial load renders saved ${widgets.length}-widget layout without defaults and uses one overview read`, async ({
    page,
  }) => {
    await login(page);
    await save(page, widgets);
    const requests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname.startsWith("/api/v1/")
      )
        requests.push(new URL(request.url()).pathname);
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/api\/v1\/overview(?:\?.*)?$/, async (route) => {
      await gate;
      await route.continue();
    });
    await page.addInitScript(() => {
      const history: string[][] = [];
      Object.assign(window, { overviewWidgetHistory: history });
      new MutationObserver(() => {
        const ids = [...document.querySelectorAll("[data-widget]")].map((e) =>
          e.getAttribute("data-widget")!,
        );
        if (ids.length && ids.join(",") !== history.at(-1)?.join(","))
          history.push(ids);
      }).observe(document, { childList: true, subtree: true });
    });
    try {
      await page.reload();
      await expect(
        page.getByText("Đang tải Tổng quan…", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("[data-widget]")).toHaveCount(0);
      await expect(page.locator(".overview-empty-layout")).toHaveCount(0);
    } finally {
      release();
    }
    await expect(
      page.locator('.overview-widget-grid[data-ready="true"]'),
    ).toBeAttached();
    await expect(page.locator("[data-widget]")).toHaveCount(widgets.length);
    expect(
      await page
        .locator("[data-widget]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-widget")),
        ),
    ).toEqual(widgets);
    await page.waitForLoadState("networkidle");
    expect(
      requests.filter((path) =>
        /\/(overview(?:\/layout)?|income|expenses|savings|investments|funds|data\/status)$/.test(
          path,
        ),
      ),
    ).toEqual(["/api/v1/overview"]);
    const history = await page.evaluate(
      () =>
        (window as unknown as { overviewWidgetHistory: string[][] })
          .overviewWidgetHistory,
    );
    for (const ids of history) expect(ids).toEqual(widgets);
  });
}

test("layout failure does not invent defaults, and retry restores the saved layout", async ({
  page,
}) => {
  await login(page);
  await save(page, ["peace"]);
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 503,
      json: {
        code: "OVERVIEW_SCHEMA_REQUIRED",
        error: "Chưa tải được bố cục. Hãy thử lại.",
      },
    }),
  );
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Chưa tải được bố cục",
  );
  await expect(page.locator("[data-widget]")).toHaveCount(0);
  await expect(page.locator(".overview-empty-layout")).toHaveCount(0);
  await page.unroute(/\/api\/v1\/overview(?:\?.*)?$/);
  await page.getByRole("button", { name: "Thử tải lại", exact: true }).click();
  await expect(page.locator("[data-widget]")).toHaveCount(1);
  await expect(page.locator('[data-widget="peace"]')).toBeVisible();
});

test("customizer fetches only new capabilities and cancel preserves previously loaded cards", async ({
  page,
}) => {
  await login(page, true);
  await save(page, ["income", "expenses"]);
  await page.reload();
  await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  const reads: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/v1\/overview(?:\?.*)?$/.test(r.url()) && r.method() === "GET")
      reads.push(r.url());
  });
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Chuyển Chi tiêu tháng này lên", exact: true })
    .click();
  await page.waitForLoadState("networkidle");
  expect(reads).toHaveLength(0);
  await dialog.locator('[data-widget-option="jars"] > label input').check();
  await expect(dialog.locator(".overview-jar-options input")).toHaveCount(18);
  expect(reads).toHaveLength(1);
  await dialog.locator(".overview-jar-options input").first().check();
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.locator("[data-widget]").first()).toHaveAttribute(
    "data-widget",
    "income",
  );
  await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(reads).toHaveLength(1);
});

test("attention follows visible modules and does not display retained alerts for hidden modules", async ({
  page,
}) => {
  await login(page);
  const month = (
    await (await page.request.get("/api/v1/income")).json()
  ).today.slice(0, 7);
  const r = await page.request.post("/api/v1/income/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: 0,
      action: {
        type: "createCategory",
        id: randomUUID(),
        start: month,
        name: "Salary",
        description: "",
      },
    },
  });
  expect(r.ok(), await r.text()).toBe(true);
  await save(page, ["attention", "income"]);
  await page.reload();
  await expect(page.locator('[data-widget="attention"]')).toContainText(
    "Thu cố định chưa nhập",
  );
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.locator('[data-widget-option="income"] > label input').uncheck();
  await d.getByRole("button", { name: "Xem thử bố cục", exact: true }).click();
  await expect(page.locator('[data-widget="attention"]')).toContainText(
    "Bật widget của một module",
  );
  await expect(page.locator('[data-widget="attention"]')).not.toContainText(
    "Thu cố định chưa nhập",
  );
  const funds = await (
    await page.request.get("/api/v1/overview?widgets=attention,funds")
  ).json();
  expect(Object.keys(funds.sources)).toEqual(["funds"]);
});

test("background refresh keeps a layout draft and invalidates details omitted from fresh totals", async ({
  page,
}) => {
  await login(page, true);
  await save(page, ["income", "expenses"]);
  await page.reload();
  await expect(page.locator('[data-widget="expenses"] dl')).toBeVisible();
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  let d = page.getByRole("dialog");
  await d.locator('[data-widget-option="jars"] > label input').check();
  await expect(d.locator(".overview-jar-options input")).toHaveCount(18);
  await d.getByRole("button", { name: "Hủy", exact: true }).click();
  const view = await (await page.request.get("/api/v1/expenses")).json();
  const jar = view.rows.find(
    (r: { month: string }) => r.month === view.today.slice(0, 7),
  );
  const renamed = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: view.book.version,
      action: {
        type: "configureJar",
        jarId: jar.jarId,
        month: jar.month,
        name: "Hũ vừa cập nhật",
        description: jar.description,
        method: jar.method,
        group: jar.group,
        amount: jar.target,
      },
    },
  });
  expect(renamed.ok(), await renamed.text()).toBe(true);
  const refreshed = page.waitForResponse(
    (r) =>
      /\/api\/v1\/overview$/.test(r.url()) && r.request().method() === "GET",
  );
  await page.clock.setFixedTime(
    (await page.evaluate(() => Date.now())) + 61000,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await expect(page.locator(".overview-refresh")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  d = page.getByRole("dialog");
  await d.locator('[data-widget-option="jars"] > label input').check();
  await expect(
    d
      .locator(".overview-jar-options")
      .getByText("Hũ vừa cập nhật", { exact: true }),
  ).toBeVisible();
  await d.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  d = page.getByRole("dialog");
  await d.locator('[data-widget-option="peace"] > label input').check();
  await save(page, ["funds"]);
  const draftRefresh = page.waitForResponse(
    (r) =>
      /\/api\/v1\/overview\?/.test(r.url()) && r.request().method() === "GET",
  );
  await page.clock.setFixedTime(
    (await page.evaluate(() => Date.now())) + 61000,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await draftRefresh;
  await expect(
    d.locator('[data-widget-option="income"] > label input'),
  ).toBeChecked();
  await expect(
    d.locator('[data-widget-option="peace"] > label input'),
  ).toBeChecked();
  await expect(
    d.locator('[data-widget-option="funds"] > label input'),
  ).not.toBeChecked();
  await d.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("thiết bị khác");
});

test("expired authentication during layout save clears figures and keeps a visible login recovery", async ({
  page,
}) => {
  await login(page, true);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator('[data-widget-option="peace"] > label input')
    .check();
  await page.route("**/api/v1/overview/layout", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 401,
          json: {
            code: "UNAUTHENTICATED",
            error: "Phiên đăng nhập đã hết hạn",
          },
        })
      : route.continue(),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-widget]")).toHaveCount(0);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Phiên đăng nhập đã hết hạn",
  );
  await expect(
    page.locator("main").getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
