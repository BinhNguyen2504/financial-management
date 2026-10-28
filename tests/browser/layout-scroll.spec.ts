import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  buildFundReviewData,
  buildFundReviewSQL,
} from "../../scripts/lib/fund-review-data";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
} from "../../scripts/lib/investment-cloud-review.mjs";
import {
  buildReviewData,
  buildReviewSQL,
} from "../../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "../../scripts/lib/savings-review-data.mjs";

async function login(page: Page, seed = false) {
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/settings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(
    page.getByRole("heading", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  if (seed) {
    const db = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      max: 1,
      onnotice: () => {},
    });
    try {
      const data = addInvestmentReviewData(
        addSavingsReviewData(buildReviewData({ ownerId })),
      );
      // A filled row and an otherwise equivalent missing row exercise table density.
      const missing = data.income.categories[1].id;
      data.income.monthly = data.income.monthly.filter(
        (row: { categoryId: string }) => row.categoryId !== missing,
      );
      for (const row of data.income.monthly)
        if (row.amount !== "0") row.amount = "999999999999999999999999";
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
  }
}

const widths = [320, 375, 390, 430, 768, 1440];
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function stripsFit(page: Page) {
  for (const strip of await page.locator(".scroll-tabs:visible").all()) {
    const result = await strip.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const buttons = [...element.querySelectorAll(":scope > button")];
      const selected = buttons.find(
        (b) =>
          b.getAttribute("aria-selected") === "true" ||
          b.getAttribute("aria-pressed") === "true",
      );
      const rect = selected?.getBoundingClientRect();
      return {
        vertical: getComputedStyle(element).flexDirection === "column",
        tops: buttons.map((b) => b.getBoundingClientRect().top),
        nowrap: buttons.every(
          (b) => getComputedStyle(b).whiteSpace === "nowrap",
        ),
        contained:
          !rect || (rect.left >= box.left - 1 && rect.right <= box.right + 1),
      };
    });
    if (result.vertical) continue;
    expect(result.nowrap).toBe(true);
    expect(
      Math.max(...result.tops) - Math.min(...result.tops),
    ).toBeLessThanOrEqual(1);
    await expect
      .poll(async () =>
        strip.evaluate((element) => {
          const selected = element.querySelector(
            '[aria-selected="true"], [aria-pressed="true"]',
          );
          if (!selected) return true;
          const tab = selected.getBoundingClientRect(),
            box = element.getBoundingClientRect();
          return tab.left >= box.left - 1 && tab.right <= box.right + 1;
        }),
      )
      .toBe(true);
  }
}
async function stationaryPickers(page: Page, requireOverflow = false) {
  let overflow = false;
  for (const table of await page.locator(".column-table:visible").all()) {
    const trigger = table.locator(".column-picker-trigger");
    if (!(await trigger.count())) continue;
    const scroll = table.locator(":scope > .column-table-scroll");
    await expect(scroll).toHaveAttribute("role", "region");
    await expect(scroll).toHaveAttribute("tabindex", "0");
    await scroll.evaluate((element) => (element.scrollLeft = 0));
    const before = (await trigger.boundingBox())!;
    const moved = await scroll.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      return element.scrollLeft;
    });
    overflow ||= moved > 0;
    const after = (await trigger.boundingBox())!;
    expect(Math.abs(before.x - after.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1);
    // The outer frame must not create a second horizontal scrollbar.
    expect(
      await table.evaluate((element) => {
        const parent = element.parentElement!;
        return !["auto", "scroll"].includes(getComputedStyle(parent).overflowX);
      }),
    ).toBe(true);
    await trigger.click();
    const popup = page
      .getByRole("dialog")
      .filter({ has: page.locator(".column-picker-heading") });
    await expect(popup).toBeVisible();
    const bounds = (await popup.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
  }
  if (requireOverflow) expect(overflow).toBe(true);
}

test("income geometry: direct period selects, whole labels, equal rows and stationary column controls in both languages", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page, true);
  for (const language of ["Tiếng Việt", "English"]) {
    await page.goto("/settings");
    await page.getByRole("radio", { name: language, exact: true }).check();
    const english = language === "English";
    await page.goto("/income");
    const strip = page.locator(".income-workspace .scroll-tabs");
    await expect(strip).toBeVisible();
    for (const [index, width] of widths.entries()) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({
        colorScheme: index % 2 ? "dark" : "light",
        reducedMotion: "reduce",
      });
      await page.evaluate(
        (visual) => (document.documentElement.dataset.visualTheme = visual),
        index % 2 ? "water" : "forest",
      );
      const controls = page.locator(".income-workspace .month-year-field");
      const boxes = await controls
        .locator("button, select")
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const r = n.getBoundingClientRect();
            return {
              x: r.x,
              right: r.right,
              bottom: r.bottom,
              h: r.height,
              w: r.width,
            };
          }),
        );
      expect(boxes).toHaveLength(2);
      await expect(controls.getByRole("button")).toHaveCount(0);
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].right);
        expect(Math.abs(boxes[i].bottom - boxes[0].bottom)).toBeLessThanOrEqual(
          1,
        );
      }
      expect(boxes.every((box) => box.h >= 44 && box.w >= 44)).toBe(true);
      // Geometry alone misses selects whose value has been ellipsized by shared CSS.
      const textFits = await controls.locator("select").evaluateAll((selects) =>
        selects.every((element) => {
          const select = element as HTMLSelectElement;
          const style = getComputedStyle(select);
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const width = context.measureText(
            select.selectedOptions[0].textContent || "",
          ).width;
          return (
            width <=
            select.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight) +
              1
          );
        }),
      );
      expect(textFits).toBe(true);

      await strip.getByRole("button").first().click();
      const beforeFocus = await page.evaluate(() => scrollY);
      const lastTab = strip.getByRole("button").last();
      await lastTab.evaluate((element) => {
        (element as HTMLElement).focus({ preventScroll: true });
      });
      await expect
        .poll(async () =>
          lastTab.evaluate((element) => {
            const box = element.parentElement!.getBoundingClientRect();
            const focused = element.getBoundingClientRect();
            return (
              focused.left >= box.left - 1 && focused.right <= box.right + 1
            );
          }),
        )
        .toBe(true);
      expect(await page.evaluate(() => scrollY)).toBe(beforeFocus);
      await lastTab.click();
      await stripsFit(page);
      await strip
        .getByRole("button", {
          name: english ? "Reports" : "Báo cáo",
          exact: true,
        })
        .click();
      await expect(page.locator(".income-table tbody tr")).toHaveCount(3);
      const rows = page.locator(".income-table tbody tr");
      const filled = rows.filter({
        has: page.getByRole("rowheader", { name: "Lương FSOFT", exact: true }),
      });
      const missing = rows.filter({
        has: page.getByRole("rowheader", { name: "Tiền nhà", exact: true }),
      });
      expect(
        Math.abs(
          (await filled.boundingBox())!.height -
            (await missing.boundingBox())!.height,
        ),
      ).toBeLessThanOrEqual(1);
      expect((await filled.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      const target = missing.locator(".income-missing-cell").first();
      // Firefox can report a 44px target a fraction below its CSS height.
      expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(
        43.99,
      );
      await stationaryPickers(page, width < 768);
      await fit(page);
    }
    await page.setViewportSize({ width: 320, height: 850 });
    await page
      .locator(".income-workspace .month-year-field")
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`income-${english ? "en" : "vi"}.png`),
      fullPage: true,
    });
    const button = page.locator(".income-missing-cell").first();
    await button.click();
    await expect(page.locator(".expense-dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      strip.getByRole("button", {
        name: english ? "Reports" : "Báo cáo",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});

test("shared report tables and tab keyboard scrolling preserve page and dialog positions", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, true);
  for (const path of ["/savings", "/investments", "/budgets"]) {
    await page.goto(path);
    await page
      .locator(".scroll-tabs")
      .first()
      .getByRole(path === "/budgets" ? "button" : "tab", {
        name: path === "/budgets" ? "Báo cáo năm" : "Báo cáo",
        exact: true,
      })
      .click();
    if (path === "/budgets")
      await page.getByRole("button", { name: "Bảng", exact: true }).click();
    await expect(page.locator(".column-table").first()).toBeVisible();
    for (const width of [320, 430, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await stripsFit(page);
      await stationaryPickers(page);
      await fit(page);
    }
    if (path !== "/budgets") {
      await page.setViewportSize({ width: 320, height: 850 });
      const strip = page.locator(".scroll-tabs").first();
      await strip.evaluate((element) =>
        element
          .querySelector<HTMLElement>('[aria-selected="true"]')
          ?.focus({ preventScroll: true }),
      );
      const y = await page.evaluate(() => scrollY);
      await page.keyboard.press("Home");
      await stripsFit(page);
      expect(await page.evaluate(() => scrollY)).toBe(y);
    }
  }
  await page.goto("/savings");
  await page
    .getByRole("button", { name: "Chi tiết Vàng tích lũy", exact: true })
    .click();
  const common = page.locator(".expense-dialog[open]");
  const commonTabs = common.locator(".dialog-tabs");
  await expect(commonTabs).toBeVisible();
  await commonTabs.getByRole("tab").first().focus();
  await page.keyboard.press("End");
  await stripsFit(page);
  await page.keyboard.press("Home");
  await stripsFit(page);
  await page.keyboard.press("Escape");
  await page.goto("/funds");
  await page
    .getByRole("button", { name: "Xem Emergency Fund", exact: true })
    .click();
  const dialog = page.locator(".expense-dialog[open]");
  await expect(dialog.locator(".fund-tabs")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  const tab = dialog.getByRole("tab").first();
  await tab.focus();
  const before = await dialog
    .locator(".dialog-body")
    .evaluate((element) => element.scrollTop);
  await page.keyboard.press("End");
  await stripsFit(page);
  expect(
    await dialog
      .locator(".dialog-body")
      .evaluate((element) => element.scrollTop),
  ).toBe(before);
  await page.keyboard.press("Escape");
});

test("application surfaces fit at all widths, enlarged text, landscape and route transitions", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, true);
  for (const language of ["Tiếng Việt", "English"]) {
    await page.goto("/settings");
    await page.getByRole("radio", { name: language, exact: true }).check();
    for (const path of [
      "/overview",
      "/income",
      "/budgets",
      "/savings",
      "/investments",
      "/funds",
      "/profile",
      "/settings",
      "/goals",
    ]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const link = page.locator(`.sidebar .navigation a[href="${path}"]`);
      if (await link.count()) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
      } else await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      if (path === "/settings")
        await page.locator(".settings-install > summary").click();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 850 });
        await stripsFit(page);
        await fit(page);
      }
      await page.setViewportSize({ width: 844, height: 390 });
      await fit(page);
      await page.setViewportSize({ width: 375, height: 850 });
      // Enlarge text only, retaining the same viewport and hit areas.
      const enlargedText = await page.addStyleTag({
        content: "button, select, label, p { font-size: 20px !important; }",
      });
      await stripsFit(page);
      await fit(page);
      const help = page.locator(".help-trigger");
      if (await help.count()) {
        await help.click();
        await expect(page.locator(".expense-dialog[open]")).toBeVisible();
        await fit(page);
        await page.keyboard.press("Escape");
      }
      await enlargedText.evaluate((element) => {
        element.parentNode?.removeChild(element);
      });
    }
  }
});

test("public landing preview tabs stay readable and scroll without moving the page", async ({
  page,
}, info) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    const preview = page.locator(".preview-tabs");
    await expect(preview).toBeVisible();
    await stripsFit(page);
    const tab = preview.getByRole("tab").first();
    await tab.scrollIntoViewIfNeeded();
    await tab.focus();
    const before = await page.evaluate(() => scrollY);
    await page.keyboard.press("End");
    await stripsFit(page);
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await fit(page);
  }
  await page.screenshot({
    path: info.outputPath("public-preview.png"),
    fullPage: true,
  });
  await page.goto("/login");
  await page.setViewportSize({ width: 320, height: 740 });
  await fit(page);
});

test("empty workspaces keep controls usable on narrow and landscape screens", async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  for (const path of [
    "/income",
    "/budgets",
    "/savings",
    "/investments",
    "/funds",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    for (const viewport of [
      { width: 320, height: 740 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await stripsFit(page);
      await fit(page);
    }
  }
});
