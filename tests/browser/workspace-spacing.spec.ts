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

test("filters stay separated from metrics and tables when collapsed, expanded and active", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  for (const route of ["budgets", "savings", "investments"]) {
    await go(page, route);
    if (route !== "budgets")
      await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
    const filters = page.locator(".filter-options");
    await expect(filters).toBeVisible();
    const trigger = filters.getByRole("button", { name: /^Bộ lọc/ });
    const minimum = page.viewportSize()!.width <= 639 ? 16 : 24;
    const check = async () => {
      const gaps = await filters.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const previous =
          element.previousElementSibling?.getBoundingClientRect();
        const next = element.nextElementSibling?.getBoundingClientRect();
        return {
          before:
            previous && previous.height ? box.top - previous.bottom : null,
          after: next && next.height ? next.top - box.bottom : null,
        };
      });
      if (gaps.before !== null)
        expect(gaps.before, `${route}: before`).toBeGreaterThanOrEqual(
          minimum - 1,
        );
      if (gaps.after !== null)
        expect(gaps.after, `${route}: after`).toBeGreaterThanOrEqual(
          minimum - 1,
        );
    };
    await check();
    if (await trigger.isVisible()) await trigger.click();
    const select = filters.getByRole("combobox").first();
    await expect(select).toBeVisible();
    await check();
    const option = await select.locator("option").nth(1).getAttribute("value");
    await select.selectOption(option!);
    await expect(
      filters.getByRole("button", { name: "Đặt lại bộ lọc", exact: true }),
    ).toBeVisible();
    await check();
    const tools = (await filters
      .locator(".filter-options-tools")
      .boundingBox())!;
    const body = (await filters.locator(".filter-options-body").boundingBox())!;
    expect(body.y - tools.y - tools.height).toBeGreaterThanOrEqual(11);
    await filters
      .getByRole("button", { name: "Đặt lại bộ lọc", exact: true })
      .click();
    await check();
    await filters.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/workspace-spacing/${info.project.name}-${route}-filters.png`,
    });
  }
});

test("expense figures keep their hierarchy and section gaps at responsive widths", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  await go(page, "budgets");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      const result = await page
        .locator(".expense-metrics")
        .evaluate((element) => {
          const heading = element.querySelector("h2")!;
          const value = element.querySelector("p")!;
          const filter = element.nextElementSibling!;
          return {
            gap:
              filter.getBoundingClientRect().top -
              element.getBoundingClientRect().bottom,
            labelSize: parseFloat(getComputedStyle(heading).fontSize),
            valueSize: parseFloat(getComputedStyle(value).fontSize),
            overflow: document.documentElement.scrollWidth - innerWidth,
            clipped: [...element.querySelectorAll(".metric")].some(
              (card) => card.scrollWidth > card.clientWidth + 1,
            ),
          };
        });
      expect(result.gap).toBeGreaterThanOrEqual(width <= 639 ? 16 : 24);
      expect(result.labelSize).toBeLessThanOrEqual(16);
      expect(result.valueSize).toBeGreaterThan(result.labelSize);
      expect(result.overflow).toBeLessThanOrEqual(1);
      expect(result.clipped).toBe(false);
      if (width !== 320) {
        await page.locator(".expense-metrics").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/workspace-spacing/${info.project.name}-budgets-${width}-${theme}.png`,
        });
      }
    }
  }
});

test("grid workspaces and inner panel headings have one source of spacing", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await login(page);
  for (const route of [
    "overview",
    "income",
    "savings",
    "investments",
    "funds",
    "goals",
    "reports",
    "settings",
    "accounts",
    "profile",
  ]) {
    await go(page, route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
      route,
    ).toBeLessThanOrEqual(1);
    const doubleSpaced = await page
      .locator(
        ".fund-workspace, .goals-workspace, .reports-workspace, .settings-workspace",
      )
      .evaluateAll((parents) =>
        parents.flatMap((parent) =>
          [...parent.children]
            .filter((child) =>
              child.matches(
                ".illustrated-heading, .page-guide, .settings-reset",
              ),
            )
            .map((child) => {
              const style = getComputedStyle(child);
              return child.matches(".settings-reset")
                ? style.marginTop
                : style.marginBottom;
            }),
        ),
      );
    expect(
      doubleSpaced.every((margin) => parseFloat(margin) === 0),
      route,
    ).toBe(true);
    if (route === "income") {
      const size = await page
        .locator(".income-summary h2")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeLessThanOrEqual(16);
    }
    if (route === "savings") {
      const heading = page.locator(".panel > .expense-section-heading").first();
      await expect(heading).toHaveCSS("margin-top", "0px");
    }
    const pairs =
      route === "investments"
        ? [
            [
              ".investment-desktop > .help-context",
              ".investment-desktop > .investment-table-scroll",
            ],
          ]
        : route === "reports"
          ? [[".reports-chart-heading", ".reports-chart > p"]]
          : route === "savings"
            ? [
                [
                  ".savings-chart > .savings-chart-interactive",
                  ".savings-chart > .animated-details",
                ],
              ]
            : [];
    for (const [before, after] of pairs) {
      const a = page.locator(before).first();
      const b = page.locator(after).first();
      if ((await a.isVisible()) && (await b.isVisible())) {
        const first = (await a.boundingBox())!;
        const second = (await b.boundingBox())!;
        expect(
          second.y - first.y - first.height,
          `${route}: content gap`,
        ).toBeGreaterThanOrEqual(15);
      }
    }
    await page.screenshot({
      path: `artifacts/workspace-spacing/${info.project.name}-${route}.png`,
    });
  }
});
