import { test, expect, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { completeTestEmailLogin } from "./helpers/test-email-login";
import { selectMonthYear } from "./helpers/month-year";
import postgres from "postgres";
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

async function login(page: Page) {
  await page.goto("/login?next=/income");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(/\/income$/);
  await expect(page.locator(".month-year-field")).toBeVisible();
}

async function boundedDialog(page: Page) {
  const dialog = page.locator(".dialog-shell[open]").last();
  await expect(dialog).toBeVisible();
  // WebKit dispatches visualViewport resize after setViewportSize resolves.
  // Wait for the real resize listener, then measure the same strict bounds.
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const viewport = window.visualViewport;
        return (
          Math.abs(
            parseFloat(
              element.style.getPropertyValue("--dialog-visible-height"),
            ) - (viewport?.height ?? innerHeight),
          ) < 1
        );
      }),
    )
    .toBe(true);
  const geometry = await dialog.evaluate((element) => {
    const r = element.getBoundingClientRect();
    const v = window.visualViewport;
    const body = element.querySelector<HTMLElement>(".dialog-body")!;
    const style = getComputedStyle(element);
    return {
      top: r.top,
      bottom: r.bottom,
      height: r.height,
      viewport: v?.height ?? innerHeight,
      offset: v?.offsetTop ?? 0,
      radius: parseFloat(style.borderBottomLeftRadius),
      overflow: body.scrollHeight > body.clientHeight,
      width: r.width,
      viewportWidth: innerWidth,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.offset + 15);
  expect(geometry.bottom).toBeLessThanOrEqual(
    geometry.offset + geometry.viewport - 15,
  );
  expect(geometry.height).toBeLessThanOrEqual(geometry.viewport * 0.9 + 1);
  expect(geometry.radius).toBeGreaterThanOrEqual(16);
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth - 31);
  return { dialog, geometry };
}

async function reachableControl(control: Locator) {
  // Bounds plus hit testing verify native top-layer dialogs without relying on
  // WebKit's occasionally stale IntersectionObserver result after orientation changes.
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const r = element.getBoundingClientRect();
        const v = window.visualViewport;
        return (
          r.height > 0 &&
          r.top >= (v?.offsetTop ?? 0) &&
          r.bottom <= (v?.offsetTop ?? 0) + (v?.height ?? innerHeight) + 1 &&
          r.left >= 0 &&
          r.right <= innerWidth + 1 &&
          element.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          )
        );
      }),
    )
    .toBe(true);
}

test("mobile navigation dismisses outside, on focus departure, Escape and desktop resize", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.locator(".mobile-menu summary");
  const menu = page.locator(".mobile-menu");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.locator(".mobile-menu a").first().click({ trial: true });
  await expect(menu).toHaveAttribute("open", "");
  await page.mouse.click(4, 800);
  await expect(menu).not.toHaveAttribute("open", "");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator("main").focus();
  await expect(menu).not.toHaveAttribute("open", "");
  await trigger.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(menu).not.toHaveAttribute("open", "");
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await page.getByRole("button", { name: /^Tài khoản của/ }).click();
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(page.locator(".user-popover")).toBeVisible();
  await trigger.click();
  await expect(page.locator(".user-popover")).toBeHidden();
  await page.locator('.mobile-menu a[href="/savings"]').click();
  await expect(page).toHaveURL(/\/savings$/);
  await expect(menu).not.toHaveAttribute("open", "");
  await page.setViewportSize({ width: 844, height: 390 });
  await trigger.click();
  const lastLink = menu.locator("a").last();
  await lastLink.focus();
  await reachableControl(lastLink);
  expect(
    (await menu.locator("nav").boundingBox())!.y +
      (await menu.locator("nav").boundingBox())!.height,
  ).toBeLessThanOrEqual(390);
});

test("every editor and Help retain mobile margins and reachable actions in short viewports", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [route, action] of [
    ["income", "Thêm thu phát sinh"],
    ["budgets", "Chọn tháng bắt đầu"],
    ["savings", "Thêm danh mục"],
    ["investments", "Thêm danh mục"],
    ["funds", "Bắt đầu xây quỹ"],
  ]) {
    await page.goto(`/${route}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: action, exact: true }).click();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 844, height: 390 },
      { width: 390, height: 360 },
    ]) {
      await page.setViewportSize(viewport);
      const { dialog } = await boundedDialog(page);
      const lastAction = dialog.locator(".dialog-footer button").last();
      await reachableControl(lastAction);
      const body = dialog.locator(".dialog-body");
      await body.evaluate(
        (element) => (element.scrollTop = element.scrollHeight),
      );
      await reachableControl(
        dialog.getByRole("button", { name: "Đóng", exact: true }),
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: info.outputPath(`${route}-form-mobile.png`),
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Hướng dẫn", exact: true }).click();
    const { dialog, geometry } = await boundedDialog(page);
    expect(geometry.overflow).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${route}-help-mobile.png`),
    });
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  }
});

test("populated modules, nested dialogs and 200 percent text remain usable across themes and languages", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await login(page);
  if (!process.env.TEST_DATABASE_ADMIN_URL)
    throw new Error(
      "Populated UI review requires the isolated local database runner.",
    );
  const db = postgres(process.env.TEST_DATABASE_ADMIN_URL, { max: 1 });
  try {
    const sample = addInvestmentReviewData(
      addSavingsReviewData(buildReviewData({ ownerId })),
    );
    await db.unsafe(buildReviewSQL(sample).seed);
    await db.unsafe(buildSavingsReviewSQL(sample).seed);
    await db.unsafe(buildInvestmentCloudReviewSQL(sample).seed);
    await db.unsafe(buildFundReviewSQL(buildFundReviewData(sample)).seed);
  } finally {
    await db.end();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const language of ["Tiếng Việt", "English"]) {
    await page.goto("/settings");
    await page.getByRole("radio", { name: language, exact: true }).check();
    for (const [index, theme] of [
      "forest",
      "water",
      "gold",
      "fire",
      "earth",
    ].entries()) {
      await page.evaluate(
        ({ theme, index }) => {
          localStorage.setItem("fm-visual-theme", theme);
          localStorage.setItem("fm-theme", index % 2 ? "dark" : "light");
          document.documentElement.dataset.visualTheme = theme;
          document.documentElement.dataset.theme = index % 2 ? "dark" : "light";
        },
        { theme, index },
      );
      for (const route of [
        "income",
        "budgets",
        "savings",
        "investments",
        "funds",
      ]) {
        await page.goto(`/${route}`);
        await expect(page.locator("html")).toHaveAttribute(
          "data-visual-theme",
          theme,
        );
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.locator(".loading-status")).toHaveCount(0);
        await page.setViewportSize({ width: 320, height: 700 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
          `${route}/${language}/${theme}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  }
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Tiếng Việt", exact: true }).check();
  await page.goto("/savings");
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const history = page.locator("details").filter({
    has: page.locator("summary").filter({ hasText: "Lịch sử thay đổi" }),
  });
  await history.locator("summary").click();
  await expect(history).toContainText("Lần ghi");
  await expect(history).not.toContainText(
    /createCategory|postTransaction|configureCategory|T\d{2}:\d{2}:\d{2}/,
  );
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Du lịch", exact: true }).click();
  await boundedDialog(page);
  await page
    .getByRole("button", { name: "Đổi biểu tượng", exact: true })
    .click();
  await boundedDialog(page);
  await expect(page.locator("dialog[open]")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await boundedDialog(page);
  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  for (const route of [
    "income",
    "savings",
    "investments",
    "funds",
    "profile",
    "settings",
    "reports",
  ]) {
    await page.goto(`/${route}`);
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
      `${route} at 200%`,
    ).toBeLessThanOrEqual(1);
  }
  await page.goto("/income");
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  const { dialog } = await boundedDialog(page);
  await reachableControl(dialog.locator(".dialog-footer button").last());
  const yearControl = (await dialog
    .locator(".month-year-controls select")
    .nth(0)
    .boundingBox())!;
  const monthControl = (await dialog
    .locator(".month-year-controls select")
    .nth(1)
    .boundingBox())!;
  expect(Math.abs(yearControl.x - monthControl.x)).toBeLessThanOrEqual(1);
  expect(monthControl.y).toBeGreaterThan(yearControl.y + yearControl.height);
  await page.screenshot({ path: info.outputPath("large-text-dialog.png") });
});

test("shared month-year controls retain bounds, form drafts, localization and server saving", async ({
  page,
}, info) => {
  await login(page);
  const period = page
    .locator(
      ".income-workspace > .expense-toolbar .month-year-field, .income-workspace .expense-toolbar .month-year-field",
    )
    .first();
  await period
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption("2000");
  await period
    .getByRole("combobox", { name: "Tháng", exact: true })
    .selectOption("1");
  await expect(period.locator("select").first()).toHaveValue("2000");
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Tên", { exact: true })
    .fill("Khoản thu dùng bộ chọn chung");
  await selectMonthYear(dialog, "Tháng", "2000-01");
  await dialog
    .getByLabel("Số tiền thực nhận (VND)", { exact: true })
    .fill("1000");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("main")).toContainText(
    "Khoản thu dùng bộ chọn chung",
  );
  for (const route of ["income", "budgets", "savings"]) {
    await page.goto(`/${route}`);
    if (route === "budgets") {
      await page
        .getByRole("button", { name: "Chọn tháng bắt đầu", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Xem trước thay đổi", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Xác nhận lưu", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
    const controls = page.locator("main .month-year-controls").first();
    await expect(controls).toBeVisible();
    for (const width of [320, 390, 768, 959, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await controls.locator("select").evaluateAll((elements) =>
        elements.map((e) => ({
          width: e.getBoundingClientRect().width,
          y: e.getBoundingClientRect().y,
        })),
      );
      expect(boxes).toHaveLength(2);
      for (const box of boxes)
        expect(box.width, `${route}/${width}`).toBeGreaterThanOrEqual(100);
      expect(
        Math.abs(boxes[0].y - boxes[1].y),
        `${route}/${width}`,
      ).toBeLessThanOrEqual(1);
      if (width === 768)
        await page.screenshot({
          path: info.outputPath(`${route}-period-tablet.png`),
        });
    }
  }
  await page.goto("/savings");
  const viewing = page.getByRole("group", {
    name: "Tháng đang xem",
    exact: true,
  });
  const today = (await (await page.request.get("/api/v1/savings")).json())
    .today as string;
  const currentMonth = Number(today.slice(5, 7));
  await expect(viewing.locator("select").first()).toHaveValue(
    today.slice(0, 4),
  );
  if (currentMonth < 12)
    await expect(
      viewing.locator(`option[value="${currentMonth + 1}"]`).last(),
    ).toHaveAttribute("disabled", "");
  await page.goto("/settings");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await page.goto("/income");
  await expect(
    page.getByRole("combobox", { name: "Year", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("combobox", { name: "Month", exact: true })
      .locator('option[value="1"]'),
  ).toHaveText("January");
});

test("responsive type roles and plain-language failures cover every application route", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  for (const route of [
    "overview",
    "income",
    "budgets",
    "savings",
    "investments",
    "funds",
    "profile",
    "settings",
    "accounts",
    "transactions",
    "goals",
    "reports",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    for (const width of [320, 390, 768, 959, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        heading: parseFloat(
          getComputedStyle(document.querySelector("main h1")!).fontSize,
        ),
        inputs: [
          ...document.querySelectorAll(
            'main input:not([type="hidden"]), main select, main textarea',
          ),
        ]
          .filter((e) => e.getClientRects().length)
          .map((e) => parseFloat(getComputedStyle(e).fontSize)),
      }));
      expect(geometry.overflow, `${route} at ${width}`).toBeLessThanOrEqual(1);
      expect(geometry.heading, route).toBe(width < 960 ? 28 : 32);
      for (const size of geometry.inputs)
        expect(size, `${route} input`).toBeGreaterThanOrEqual(16);
    }
    await page.screenshot({
      path: info.outputPath(`${route}-desktop.png`),
      fullPage: true,
    });
  }
  await page.route(/\/api\/v1\/savings(?:\?|$)/, (route) =>
    route.fulfill({
      status: 503,
      json: { code: "SCHEMA_NOT_READY", error: "Apply PostgreSQL migration" },
    }),
  );
  await page.goto("/savings");
  await expect(page.locator("main")).toContainText(
    "Tính năng này tạm thời chưa sẵn sàng",
  );
  await expect(page.locator("main")).not.toContainText(
    /PostgreSQL|migration|Supabase/,
  );
});
