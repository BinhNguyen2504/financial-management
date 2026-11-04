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

async function login(page: Page, seed = true) {
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/income");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(/\/income$/);
  await expect(page.locator("main .month-year-field")).toBeVisible();
  await page.waitForLoadState("networkidle");
  if (seed) {
    const db = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      max: 1,
      onnotice: () => {},
    });
    try {
      const data = addInvestmentReviewData(
        addSavingsReviewData(buildReviewData({ ownerId: owner })),
      );
      for (const sql of [
        buildReviewSQL(data).seed,
        buildSavingsReviewSQL(data).seed,
        buildInvestmentCloudReviewSQL(data).seed,
        buildFundReviewSQL(buildFundReviewData(data)).seed,
      ])
        await db.unsafe(sql);
    } finally {
      await db.end();
    }
    await page.reload();
  }
  return owner;
}

async function go(page: Page, route: string) {
  await page.goto(`/${route}`);
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("every financial editor protects changed and invalid drafts on close", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page);
  for (const [route, action, field] of [
    ["income", "Thêm thu phát sinh", "Tên"],
    ["budgets", "Thêm hũ", "Tên hũ"],
    ["savings", "Thêm danh mục", "Tên danh mục"],
    ["funds", "Ghi giao dịch", "Số tiền (VND)"],
    ["investments", "Thêm danh mục", "Tên danh mục"],
    ["goals", "Tạo mục tiêu", "Tên mục tiêu"],
  ]) {
    await go(page, route);
    const opener = page
      .getByRole("button", { name: action, exact: true })
      .first();
    await opener.click();
    let dialog = page.locator("dialog[open]").last();
    // An unchanged form must close without a confirmation.
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await opener.click();
    dialog = page.locator("dialog[open]").last();
    const input = dialog.getByLabel(field, { exact: true });
    await expect(input).toBeVisible();
    const raw = route === "funds" ? "invalid-amount" : "A draft to preserve";
    await input.fill(raw);
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    const confirmation = page.locator("dialog[open]").last();
    await expect(
      confirmation.getByRole("button", { name: "Bỏ thay đổi", exact: true }),
    ).toBeVisible();
    await confirmation
      .getByRole("button", { name: "Tiếp tục nhập", exact: true })
      .click();
    await expect(input).toHaveValue(raw);
    await page.mouse.click(2, 2);
    await page
      .locator("dialog[open]")
      .last()
      .getByRole("button", { name: "Tiếp tục nhập", exact: true })
      .click();
    await expect(input).toHaveValue(raw);
    await page.keyboard.press("Escape");
    await page
      .locator("dialog[open]")
      .last()
      .getByRole("button", { name: "Bỏ thay đổi", exact: true })
      .click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("periods tabs and filters survive navigation and reset without crossing accounts", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page);
  const today = (await (await page.request.get("/api/v1/income")).json())
    .today as string;
  const alternate =
    Number(today.slice(5, 7)) === 1 ? 2 : Number(today.slice(5, 7)) - 1;
  for (const route of ["income", "budgets", "savings"]) {
    await go(page, route);
    const selects = page.locator("main .month-year-field select");
    await selects.last().selectOption(String(alternate));
    await go(page, "overview");
    await go(page, route);
    await expect(selects.last()).toHaveValue(String(alternate));
    await page
      .getByRole("button", { name: "Về kỳ hiện tại", exact: true })
      .click();
    await expect(selects.last()).toHaveValue(String(Number(today.slice(5, 7))));
  }
  await go(page, "budgets");
  const filters = page.locator(".filter-options");
  if (await filters.getByRole("button", { name: /^Bộ lọc/ }).isVisible())
    await filters.getByRole("button", { name: /^Bộ lọc/ }).click();
  await filters
    .getByRole("combobox", { name: "Loại hũ", exact: true })
    .selectOption("accumulation");
  await go(page, "overview");
  await go(page, "budgets");
  if (await filters.getByRole("button", { name: /^Bộ lọc/ }).isVisible())
    await filters.getByRole("button", { name: /^Bộ lọc/ }).click();
  await expect(
    filters.getByRole("combobox", { name: "Loại hũ", exact: true }),
  ).toHaveValue("accumulation");
  await filters
    .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
    .click();
  await expect(
    filters.getByRole("combobox", { name: "Loại hũ", exact: true }),
  ).toHaveValue("");
  await go(page, "income");
  await page
    .locator("main .month-year-field select")
    .last()
    .selectOption(String(alternate));
  await page
    .getByRole("button", { name: "Nguồn thu đều đặn", exact: true })
    .click();
  await go(page, "overview");
  await go(page, "income");
  await expect(
    page.getByRole("button", { name: "Nguồn thu đều đặn", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Tài khoản của/ }).click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await login(page, false);
  await expect(
    page.locator("main .month-year-field select").last(),
  ).toHaveValue(String(Number(today.slice(5, 7))));
  await expect(
    page.getByRole("button", { name: "Nhập thu nhập", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("working screens show key figures on a phone and keep settings and navigation ordered", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await login(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const pending = new Set<object>();
  let lastActivity = Date.now();
  page.on("request", (request) => {
    pending.add(request);
    lastActivity = Date.now();
  });
  const finished = (request: object) => {
    pending.delete(request);
    lastActivity = Date.now();
  };
  page.on("requestfinished", finished);
  page.on("requestfailed", finished);
  const quiet = () =>
    expect
      .poll(() => pending.size === 0 && Date.now() - lastActivity >= 600)
      .toBe(true);
  const metrics: Record<string, string> = {
    income: ".income-summary",
    budgets: ".expense-metrics",
    savings: ".savings-metrics",
    investments: ".investment-metrics",
    funds: ".fund-health",
    reports: ".reports-metrics",
  };
  for (const width of [390, 320, 768, 1440]) {
    lastActivity = Date.now();
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
    // Resizing exposes navigation links and starts RSC prefetches. Let the
    // IntersectionObserver register them before navigating the document away;
    // WebKit reports aborted old-document fetches as access-control pageerrors.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    // A previously satisfied networkidle load state can return immediately;
    // measure actual request completion and a fresh quiet interval instead.
    await quiet();
    for (const route of [...Object.keys(metrics), "settings"]) {
      await go(page, route);
      await quiet();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        `${route} at ${width}`,
      ).toBeLessThanOrEqual(1);
      if (width === 390 && metrics[route]) {
        const box = await page.locator(metrics[route]).first().boundingBox();
        expect(box, route).not.toBeNull();
        expect(box!.y, route).toBeLessThan(780);
        await page.screenshot({
          path: `artifacts/workspace-comfort/${info.project.name}-${route}-390.png`,
        });
      }
    }
  }
  await go(page, "settings");
  const appearance = (await page
    .locator(".settings-appearance")
    .boundingBox())!;
  const backup = (await page.locator(".settings-data").boundingBox())!;
  const install = (await page.locator(".settings-install").boundingBox())!;
  const reset = (await page.locator(".settings-reset").boundingBox())!;
  expect(appearance.y).toBeLessThan(backup.y);
  expect(backup.y).toBeLessThan(install.y);
  expect(install.y).toBeLessThan(reset.y);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".mobile-menu > summary").click();
  await expect(page.locator(".mobile-menu .navigation-group-label")).toHaveText(
    ["Thu nhập & Chi tiêu", "Tích lũy"],
  );
  const planned = page.locator(".mobile-menu .navigation-planned");
  await expect(planned).not.toHaveAttribute("open");
  await planned.locator("summary").click();
  await planned.locator('a[href="/accounts"]').click();
  await expect(page).toHaveURL(/\/accounts$/);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".mobile-menu")).not.toHaveAttribute("open");
  await page.locator(".mobile-menu > summary").click();
  await expect(planned).toHaveAttribute("open");
  await quiet();
  expect(errors).toEqual([]);
});

test("report URL wins over remembered context and explanations remain available", async ({
  page,
}) => {
  await login(page);
  await go(page, "reports?tab=savings&period=year&year=2025&month=6");
  await expect(page.locator('[data-report-ready="true"]')).toBeVisible();
  await expect(page.locator(".reports-tabs button.active")).toHaveText(
    "Tiết kiệm",
  );
  await go(page, "income");
  await go(page, "reports");
  await expect(page.locator(".reports-tabs button.active")).toHaveText(
    "Tiết kiệm",
  );
  await expect(
    page.getByRole("combobox", { name: "Năm", exact: true }),
  ).toHaveValue("2025");
  await go(page, "reports?tab=cashflow&period=month&year=2026&month=10");
  await expect(page.locator(".reports-tabs button.active")).toHaveText(
    "Thu–chi",
  );
  await page.locator(".reports-explanation summary").click();
  await expect(page.locator(".reports-explanation")).toContainText(
    "Kỳ trước đầy đủ",
  );
});

test("a mobile secondary action returns focus to its visible menu trigger", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "savings");
  const trigger = page.getByRole("button", {
    name: "Thao tác khác",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("button", { name: "Chốt tháng", exact: true }).click();
  const dialog = page.locator("dialog[open]").last();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("secondary action menus fit narrow screens in both languages and recover after resizing", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  for (const language of ["Tiếng Việt", "English"]) {
    await go(page, "settings");
    await page.getByRole("radio", { name: language, exact: true }).check();
    for (const route of ["savings", "investments", "reports"]) {
      await go(page, route);
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        await page.waitForLoadState("networkidle");
        const trigger = page.locator(".action-options-trigger");
        if (width <= 390) await trigger.click();
        const menu = page.locator(".action-options-body");
        await expect(menu).toBeVisible();
        const box = (await menu.boundingBox())!;
        expect(box.x, `${route}, ${language}, ${width}`).toBeGreaterThanOrEqual(
          19,
        );
        expect(
          box.x + box.width,
          `${route}, ${language}, ${width}`,
        ).toBeLessThanOrEqual(width - 19);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        if (width === 320)
          await page.screenshot({
            path: `artifacts/workspace-comfort/${info.project.name}-${route}-${language === "English" ? "en" : "vi"}-actions-320.png`,
          });
        if (width <= 390) {
          await page.keyboard.press("Escape");
          await expect(trigger).toBeFocused();
          await expect(menu).toBeHidden();
        }
      }
    }
  }
});
