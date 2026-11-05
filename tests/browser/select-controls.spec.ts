import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { completeTestEmailLogin } from "./helpers/test-email-login";
import { visualThemeKeys } from "../../src/components/visual-theme";
import postgres from "postgres";
import { investmentClock } from "../../src/domain/investments/engine";
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
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/investments");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(/\/investments$/);
  await expect(
    page.getByRole("button", { name: "Thêm danh mục", exact: true }),
  ).toBeEnabled();
  return owner;
}

test("investment report filters and chart controls stay compact and readable", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await login(page);
  const today = investmentClock().today;
  const asset = randomUUID(),
    wallet = randomUUID();
  await investmentCommand(page, {
    type: "createCategory",
    id: asset,
    walletId: wallet,
    kind: "investment",
    name: "Danh mục báo cáo",
    emoji: "🌱",
    start: today,
  });
  await investmentCommand(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      categoryId: wallet,
      date: today,
      amount: "1000000",
    },
  });
  for (const locale of ["vi", "en"]) {
    await page.goto("/");
    await page.locator(".public-language select").selectOption(locale);
    await page.goto("/investments");
    await page.locator("#investment-tab-reports").click();
    const panel = page.locator(".investment-filters");
    for (const period of ["custom", "month", "quarter", "year"]) {
      await panel.locator("select").first().selectOption(period);
      for (const mode of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: mode as "light" | "dark" });
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await controlsFit(panel);
          const grid = await panel
            .locator(".investment-filter-fields")
            .evaluate((element) => {
              const r = element.getBoundingClientRect();
              const s = getComputedStyle(element);
              return {
                width: r.width,
                columns: s.gridTemplateColumns.split(" ").length,
                overflow: element.scrollWidth - element.clientWidth,
              };
            });
          expect(grid.columns).toBe(
            grid.width >= 900 ? 4 : grid.width >= 560 ? 2 : 1,
          );
          expect(grid.overflow).toBeLessThanOrEqual(1);
          const heading = page.locator(".investment-chart-heading");
          await expect(heading).toBeVisible();
          await controlsFit(heading);
          const spacing = await heading.locator("label").evaluate((label) => {
            const select = label.querySelector("select")!;
            const range = document.createRange();
            range.selectNodeContents(label.firstChild!);
            return (
              select.getBoundingClientRect().top -
              range.getBoundingClientRect().bottom
            );
          });
          expect(spacing).toBeGreaterThanOrEqual(7.9);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          ).toBeLessThanOrEqual(1);
          if (period === "month" && [390, 1440].includes(width))
            await page.screenshot({
              path: info.outputPath(`report-${locale}-${mode}-${width}.png`),
              fullPage: true,
            });
        }
      }
    }
    // All chart options still work after changing report periods.
    const chart = page.locator(".investment-chart-control select");
    for (const value of [
      "flow",
      "profit",
      "cost",
      "cash",
      "assetValue",
      "value",
    ]) {
      await chart.selectOption(value);
      await expect(chart).toHaveValue(value);
    }
    const download = page.waitForEvent("download");
    await panel.locator(".investment-report-actions button").click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  }
});

async function seedModules(owner: string) {
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
}

async function investmentCommand(page: Page, action: unknown) {
  const view = await (await page.request.get("/api/v1/investments")).json();
  const response = await page.request.post("/api/v1/investments/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: view.book?.version ?? 0,
      action,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function controlsFit(scope: Locator) {
  const controls = scope.locator(
    "select:visible:not([multiple]):not([size]), select:visible[size='1']",
  );
  await expect(controls.first()).toBeVisible();
  for (const control of await controls.all()) {
    const style = await control.evaluate((element) => {
      const s = getComputedStyle(element),
        r = element.getBoundingClientRect();
      return {
        appearance: s.appearance,
        height: r.height,
        font: parseFloat(s.fontSize),
        arrow: s.backgroundImage,
        padding: parseFloat(s.paddingRight),
        left: r.left,
        right: r.right,
        viewport: innerWidth,
      };
    });
    expect(style.appearance).toBe("none");
    expect(style.height).toBeGreaterThanOrEqual(43.5);
    expect(style.font).toBeGreaterThanOrEqual(16);
    expect(style.arrow).not.toBe("none");
    expect(style.padding).toBeGreaterThanOrEqual(28);
    expect(style.left).toBeGreaterThanOrEqual(0);
    expect(style.right).toBeLessThanOrEqual(style.viewport + 1);
  }
}

async function filterGeometry(page: Page) {
  return page.locator(".investment-filters").evaluate((panel) => {
    const rect = (e: Element) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        bottom: r.bottom,
      };
    };
    const controls = [
      ...panel.querySelectorAll("input:not([type='checkbox']), select"),
    ].map(rect);
    const checkbox = panel.querySelector<HTMLInputElement>(
      "input[type='checkbox']",
    )!;
    const label = checkbox.closest("label")!;
    const style = getComputedStyle(panel);
    return {
      controls,
      label: rect(label),
      checkbox: rect(checkbox),
      contentWidth:
        panel.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

function assertFilterGeometry(g: Awaited<ReturnType<typeof filterGeometry>>) {
  const columns = g.contentWidth >= 900 ? 4 : g.contentWidth >= 560 ? 2 : 1;
  expect(g.controls).toHaveLength(4);
  const heights = g.controls.map((r) => r.height);
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(45.5);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  for (let i = 0; i < 4; i++) {
    expect(
      Math.abs(
        g.controls[i].width - (g.contentWidth - (columns - 1) * 16) / columns,
      ),
    ).toBeLessThanOrEqual(1);
    if (i % columns !== 0)
      expect(
        Math.abs(g.controls[i].y - g.controls[i - 1].y),
      ).toBeLessThanOrEqual(1);
  }
  expect(
    g.label.y - Math.max(...g.controls.map((r) => r.bottom)),
  ).toBeGreaterThanOrEqual(15.5);
  expect(Math.abs(g.label.x - g.controls[0].x)).toBeLessThanOrEqual(1);
  expect(g.label.height).toBeGreaterThanOrEqual(43.5);
  expect(g.checkbox.width).toBeCloseTo(20, 0);
  expect(g.checkbox.height).toBeCloseTo(20, 0);
  expect(g.overflow).toBeLessThanOrEqual(1);
}

test("investment filter geometry keeps fields aligned and cancelled checkbox on its own row", async ({
  page,
}, info) => {
  await login(page);
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const measurements = [];
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .locator(".investment-filters")
      .screenshot({ path: info.outputPath(`filters-${viewport.width}.png`) });
    measurements.push({ viewport, geometry: await filterGeometry(page) });
  }
  await info.attach("geometry", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  for (const { geometry } of measurements) assertFilterGeometry(geometry);
  // Container boundaries also work with either sidebar state and enlarged text.
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const width of [559, 560, 561, 899, 900, 901]) {
    await page.locator(".investment-filters").evaluate((panel, size) => {
      const style = getComputedStyle(panel);
      (panel as HTMLElement).style.width =
        `${size + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)}px`;
    }, width);
    assertFilterGeometry(await filterGeometry(page));
  }
});

test("selects retain native selection and filter live and cancelled investment transactions", async ({
  page,
}) => {
  await login(page);
  const today = investmentClock().today;
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const prior = yesterday.toISOString().slice(0, 10);
  const asset = randomUUID(),
    wallet = randomUUID(),
    other = randomUUID(),
    otherWallet = randomUUID();
  for (const [id, walletId, name] of [
    [
      asset,
      wallet,
      "Danh mục có tên dài để kiểm tra lựa chọn trên màn hình hẹp",
    ],
    [other, otherWallet, "Danh mục khác"],
  ])
    await investmentCommand(page, {
      type: "createCategory",
      id,
      walletId,
      kind: "investment",
      name,
      emoji: "🌱",
      start: prior,
    });
  const cancelled = randomUUID();
  for (const [id, categoryId, date, note] of [
    [randomUUID(), wallet, prior, "Khoản hôm trước"],
    [randomUUID(), wallet, today, "Khoản hôm nay"],
    [cancelled, wallet, today, "Khoản đã hủy"],
    [randomUUID(), otherWallet, today, "Khoản danh mục khác"],
  ])
    await investmentCommand(page, {
      type: "postTransaction",
      transaction: {
        id,
        kind: "deposit",
        categoryId,
        date,
        amount: "1000000",
        note,
      },
    });
  await investmentCommand(page, {
    type: "reviseTransaction",
    transactionId: cancelled,
    replacement: null,
    reason: "Kiểm thử bộ lọc",
  });
  const before = await (await page.request.get("/api/v1/investments")).json();
  await page.reload();
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const rows = page.locator(".investment-activity");
  await expect(rows).toHaveCount(3);
  const category = page.getByRole("combobox", {
    name: "Danh mục / ví giao dịch",
    exact: true,
  });
  await category.selectOption(wallet);
  await expect(rows).toHaveCount(2);
  await page.getByLabel("Từ ngày giao dịch", { exact: true }).fill(today);
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Khoản hôm nay");
  const checkbox = page.getByRole("checkbox", {
    name: "Hiện cả giao dịch đã hủy",
    exact: true,
  });
  await page.locator(".investment-filters .investment-checkbox span").click();
  await expect(checkbox).toBeChecked();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Khoản đã hủy" })).toContainText(
    "đã hủy",
  );
  const kind = page.getByRole("combobox", {
    name: "Loại giao dịch lọc",
    exact: true,
  });
  await kind.selectOption("withdraw");
  await expect(rows).toHaveCount(0);
  await expect(
    page.getByText("Chưa có giao dịch phù hợp bộ lọc.", { exact: true }),
  ).toBeVisible();
  // Native type-ahead works across macOS engines without automating OS popup arrows.
  await kind.focus();
  await page.keyboard.press("n");
  await expect(kind).toHaveValue("deposit");
  await expect(rows).toHaveCount(2);
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
  await expect(rows).toHaveCount(1);
  await page.getByLabel("Đến ngày giao dịch", { exact: true }).fill(prior);
  await expect(rows).toHaveCount(0);
  await page.getByLabel("Từ ngày giao dịch", { exact: true }).fill(prior);
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Khoản hôm trước");
  await category.selectOption(otherWallet);
  await expect(rows).toHaveCount(0);
  await category.selectOption(wallet);
  await expect(rows).toHaveCount(1);
  const after = await (await page.request.get("/api/v1/investments")).json();
  expect(after.book).toEqual(before.book);
});

test("shared selects keep size and arrows across modules, dialogs and client navigation", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const owner = await login(page);
  await seedModules(owner);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "budgets",
    "income",
    "savings",
    "investments",
    "funds",
    "goals",
    "profile",
    "investments",
    "budgets",
  ]) {
    // Links preserve route styles in the DOM, exposing background shorthand conflicts.
    if (path === "profile") {
      await page.getByRole("button", { name: /^Tài khoản của/ }).click();
      await page
        .getByRole("link", { name: "Thông tin cá nhân", exact: true })
        .click();
    } else await page.locator(`.sidebar a[href='/${path}']`).click();
    await expect(page).toHaveURL(new RegExp(`/${path}(\\?|$)`));
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main .loading-status")).toHaveCount(0);
    if (path === "investments" || path === "savings")
      await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
    if (path === "goals") {
      await page
        .getByRole("button", { name: "Tạo mục tiêu", exact: true })
        .click();
    }
    const scope =
      path === "goals" ? page.getByRole("dialog").last() : page.locator("main");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await controlsFit(scope);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        path,
      ).toBeLessThanOrEqual(1);
    }
    await page.screenshot({
      path: info.outputPath(`${path}-320.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (path === "goals") await page.keyboard.press("Escape");
    else if (path !== "profile") {
      const opener =
        path === "budgets"
          ? page.getByRole("button", { name: "Thêm hũ", exact: true })
          : path === "income"
            ? page.getByRole("button", {
                name: "Thêm thu phát sinh",
                exact: true,
              })
            : path === "funds"
              ? page
                  .locator(".fund-ledger")
                  .first()
                  .getByRole("button", { name: "Ghi giao dịch", exact: true })
              : page.getByRole("button", {
                  name: "Ghi giao dịch",
                  exact: true,
                });
      await opener.click();
      await controlsFit(page.getByRole("dialog").last());
      await page.setViewportSize({ width: 320, height: 700 });
      await controlsFit(page.getByRole("dialog").last());
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  expect(errors).toEqual([]);
});

test("investment filters fit both locales, five themes, dark mode and enlarged text", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  for (const locale of ["vi", "en"]) {
    await page.goto("/");
    await page.locator(".public-language select").selectOption(locale);
    await page.goto("/investments");
    await page.locator("#investment-tab-transactions").click();
    for (const theme of visualThemeKeys)
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.visualTheme = theme;
            document.documentElement.dataset.theme = mode;
          },
          { theme, mode },
        );
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await controlsFit(page.locator(".investment-filters"));
          assertFilterGeometry(await filterGeometry(page));
          if (theme === "forest" || theme === "earth")
            await page.locator(".investment-filters").screenshot({
              path: info.outputPath(`${locale}-${theme}-${mode}-${width}.png`),
            });
        }
      }
    for (const size of ["125%", "200%"]) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, size);
      for (const width of [1440, 768, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assertFilterGeometry(await filterGeometry(page));
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  }
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".investment-filters select").first()).toHaveCSS(
    "appearance",
    "auto",
  );
});

test("public language select keeps its compact height and single separate chevron", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const locale of ["vi", "en"]) {
      const select = page.locator(".public-language select");
      await select.selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(select).toHaveCSS("background-image", "none");
      await expect(select).toHaveCSS("height", "44px");
      await expect(page.locator(".public-language-chevron")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
  }
});
