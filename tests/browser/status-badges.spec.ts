import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
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
import { visualThemeKeys } from "../../src/components/visual-theme";

async function loginWithSamples(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });
  await page.goto("/login?next=/savings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/savings$/);
  await expect(
    page.getByRole("button", { name: "Thêm danh mục", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  const db = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
    max: 1,
    onnotice: () => {},
  });
  try {
    const data = addInvestmentReviewData(
      addSavingsReviewData(buildReviewData({ ownerId })),
    );
    // Leave one real missing entry so the Income report has its warning state.
    data.income.monthly = data.income.monthly.slice(1);
    for (const sql of [
      buildReviewSQL(data).seed,
      buildSavingsReviewSQL(data).seed,
      buildInvestmentCloudReviewSQL(data).seed,
    ])
      await db.unsafe(sql);
  } finally {
    await db.end();
  }
  await page.reload();
  await expect(page.locator(".savings-toolbar .status-badge")).toBeVisible();
}

async function checkBadges(page: Page) {
  const checks = await page.locator(".status-badge").evaluateAll((elements) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    function luminance(color: string) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map((c) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
      return r * 0.2126 + g * 0.7152 + b * 0.0722;
    }
    return elements
      .filter((el) => el.checkVisibility())
      .map((el) => {
        const label = el.querySelector<HTMLElement>(".status-badge-label")!;
        const style = getComputedStyle(el);
        const text = getComputedStyle(label);
        const [lo, hi] = [
          luminance(text.color),
          luminance(style.backgroundColor),
        ].sort((a, b) => a - b);
        const icon = el.querySelector(":scope > svg");
        return {
          label: label.textContent,
          contrast: (hi + 0.05) / (lo + 0.05),
          font: parseFloat(text.fontSize),
          weight: Number(text.fontWeight),
          border: parseFloat(style.borderTopWidth),
          background: style.backgroundColor,
          fits: label.scrollWidth <= label.clientWidth + 1,
          iconWidth: icon?.getBoundingClientRect().width ?? 0,
          iconHidden: !icon || icon.getAttribute("aria-hidden") === "true",
        };
      });
  });
  expect(checks.length).toBeGreaterThan(0);
  for (const check of checks) {
    expect(check.contrast, `${check.label}: contrast`).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(check.font, `${check.label}: font`).toBeGreaterThanOrEqual(12);
    expect(check.weight, `${check.label}: weight`).toBeGreaterThanOrEqual(600);
    expect(check.border).toBeGreaterThanOrEqual(1);
    expect(check.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(check.fits, `${check.label}: label clipping`).toBe(true);
    expect(
      check.iconWidth,
      `${check.label}: icon geometry`,
    ).toBeLessThanOrEqual(16);
    expect(check.iconHidden).toBe(true);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

async function createGoalSample(page: Page) {
  const v = await (await page.request.get("/api/v1/goals")).json();
  const r = await page.request.post("/api/v1/goals/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: v.book?.version ?? 0,
      expectedSources: v.sources.versions,
      action: {
        type: "saveGoal",
        goal: {
          id: randomUUID(),
          name: "Du lịch gia đình",
          note: "",
          purpose: "spending",
          mode: "ledger",
          basis: "value",
          target: "100000000",
          deadline: null,
          monthly: "0",
          links: [],
        },
      },
    },
  });
  expect(r.ok(), await r.text()).toBe(true);
}
test("status badges keep contrast and geometry across themes, modes, languages and widths", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await loginWithSamples(page);
  for (const visual of visualThemeKeys) {
    for (const mode of ["light", "dark"] as const) {
      for (const locale of ["vi", "en"] as const) {
        await page.evaluate(
          ({ visual, mode, locale }) => {
            localStorage.setItem("fm-visual-theme", visual);
            localStorage.setItem("fm-theme", mode);
            localStorage.setItem("fm-locale", locale);
            window.dispatchEvent(new Event("fm-preference-change"));
            window.dispatchEvent(
              new CustomEvent("fm-locale-change", { detail: locale }),
            );
          },
          { visual, mode, locale },
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
        await expect(page.locator("html")).toHaveAttribute(
          "data-visual-theme",
          visual,
        );
        await expect(page.locator(".savings-toolbar .status-badge")).toHaveText(
          locale === "en" ? "Provisional" : "Tạm tính",
        );
        // Check every semantic pair, including states absent in this account.
        const ratios = await page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          const ctx = document.createElement("canvas").getContext("2d")!;
          const luminance = (token: string) => {
            ctx.fillStyle = style.getPropertyValue(token).trim();
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data)
              .slice(0, 3)
              .map((c) => {
                const n = c / 255;
                return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
              });
            return r * 0.2126 + g * 0.7152 + b * 0.0722;
          };
          return ["neutral", "info", "success", "warning", "danger"].map(
            (tone) => {
              const [lo, hi] = [
                luminance(`--badge-${tone}-ink`),
                luminance(`--badge-${tone}-fill`),
              ].sort((a, b) => a - b);
              return { tone, ratio: (hi + 0.05) / (lo + 0.05) };
            },
          );
        });
        for (const { tone, ratio } of ratios)
          expect(ratio, `${visual}/${mode}/${tone}`).toBeGreaterThanOrEqual(
            4.5,
          );
        for (const width of [320, 375, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await checkBadges(page);
        }
      }
      await page.screenshot({
        path: info.outputPath(`badges-${visual}-${mode}.png`),
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.evaluate(() => {
    localStorage.setItem("fm-theme", "system");
    window.dispatchEvent(new Event("fm-preference-change"));
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await checkBadges(page);
});

test("status labels stay readable in module reports, planned pages and the public preview", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await loginWithSamples(page);
  await createGoalSample(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, tab] of [
    ["income", "Danh mục cố định"],
    ["income", "Báo cáo"],
    ["budgets", "Báo cáo năm"],
    ["savings", "Báo cáo"],
    ["investments", "Báo cáo"],
    // Goals is implemented; Accounts exercises the planned-page status.
    ["accounts", ""],
    ["funds", ""],
    ["goals", ""],
    ["settings", ""],
    ["", ""],
  ]) {
    await page.goto(`/${route}`);
    if (tab)
      await page
        .getByRole(
          route === "savings" || route === "investments" ? "tab" : "button",
          { name: tab, exact: true },
        )
        .click();
    if (route === "budgets")
      await page.getByRole("button", { name: "Bảng", exact: true }).click();
    if (route === "settings")
      await page
        .locator("summary")
        .filter({ hasText: "Cài lên màn hình chính" })
        .click();
    await expect(page.locator("main .status-badge").first()).toBeVisible();
    for (const mode of ["light", "dark"]) {
      await page.evaluate((mode) => {
        localStorage.setItem("fm-theme", mode);
        window.dispatchEvent(new Event("fm-preference-change"));
      }, mode);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await checkBadges(page);
        if (width === 320)
          await page.screenshot({
            path: info.outputPath(
              `${route || "member-landing"}-${tab || "main"}-${mode}-320.png`,
            ),
            fullPage: true,
          });
      }
      await page.screenshot({
        path: info.outputPath(
          `${route || "member-landing"}-${tab || "main"}-${mode}.png`,
        ),
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
  // The signed-out preview remains illustrative and does not request finances.
  await page.context().clearCookies();
  const financial: string[] = [];
  page.on("request", (request) => {
    if (
      /\/api\/v1\/(income|expenses|savings|investments|funds)/.test(
        request.url(),
      )
    )
      financial.push(request.url());
  });
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 900 });
  await checkBadges(page);
  await page.screenshot({
    path: info.outputPath("guest-landing-320.png"),
    fullPage: true,
  });
  expect(financial).toEqual([]);
});

test("status placement follows the category, selected period and report date without crowding them", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await loginWithSamples(page);
  const current = await (await page.request.get("/api/v1/income")).json();
  const created = await page.request.post("/api/v1/income/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: current.book.version,
      action: {
        type: "createCategory",
        id: randomUUID(),
        start: current.today.slice(0, 7),
        name: "Thu nhập từ dự án cá nhân và công việc hợp tác dài hạn",
        description: "Nguồn thử bố cục tên dài",
      },
    },
  });
  expect(created.ok(), await created.text()).toBe(true);
  await createGoalSample(page);
  const measurements: unknown[] = [];
  for (const route of ["savings", "income", "investments", "goals"]) {
    await page.evaluate(() => {
      localStorage.setItem("fm-locale", "vi");
      window.dispatchEvent(
        new CustomEvent("fm-locale-change", { detail: "vi" }),
      );
    });
    await page.goto(`/${route}`);
    if (route === "income")
      await page
        .getByRole("button", { name: "Danh mục cố định", exact: true })
        .click();
    if (route === "investments")
      await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
    await expect(page.locator("main .status-badge").first()).toBeVisible();
    for (const locale of ["vi", "en"]) {
      await page.evaluate((locale) => {
        localStorage.setItem("fm-locale", locale);
        window.dispatchEvent(
          new CustomEvent("fm-locale-change", { detail: locale }),
        );
      }, locale);
      for (const mode of ["light", "dark"]) {
        await page.evaluate((mode) => {
          localStorage.setItem("fm-theme", mode);
          window.dispatchEvent(new Event("fm-preference-change"));
        }, mode);
        for (const width of [320, 768, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await checkBadges(page);
          const geometry = await page.evaluate((route) => {
            const rect = (el: Element) => {
              const b = el.getBoundingClientRect();
              return {
                x: b.x,
                y: b.y,
                right: b.right,
                bottom: b.bottom,
                height: b.height,
                width: b.width,
              };
            };
            const overlaps = (a: Element, b: Element) => {
              const x = rect(a),
                y = rect(b);
              return (
                Math.min(x.right, y.right) - Math.max(x.x, y.x) > 1 &&
                Math.min(x.bottom, y.bottom) - Math.max(x.y, y.y) > 1
              );
            };
            if (route === "savings") {
              const group = document.querySelector(
                ".savings-toolbar .month-year-field",
              )!;
              const legend = group.querySelector(".month-year-legend")!;
              const label = legend.firstElementChild!;
              const badge = legend.querySelector(".status-badge")!;
              const controls = group.querySelector(".month-year-controls")!;
              return {
                valid:
                  !overlaps(label, badge) &&
                  rect(badge).bottom <= rect(legend).bottom + 1 &&
                  rect(controls).y >= rect(legend).bottom + 6 &&
                  rect(badge).right <= rect(group).right + 1,
                detached: document.querySelectorAll(
                  ".savings-toolbar > .status-badge",
                ).length,
                label: rect(label),
                badge: rect(badge),
                controls: rect(controls),
              };
            }
            if (route === "income") {
              const rows = Array.from(
                document.querySelectorAll(".income-list > .income-item"),
              );
              const cards = rows.map((row) => {
                const header = row.querySelector(".status-heading")!;
                const title = header.querySelector("h3")!;
                const badge = header.querySelector(".status-badge")!;
                const date = row.querySelector(".expense-muted")!;
                const actions = row.querySelector(".expense-actions")!;
                return {
                  valid:
                    !overlaps(title, badge) &&
                    !overlaps(header, actions) &&
                    rect(date).y >= rect(header).bottom + 3 &&
                    rect(badge).right <= rect(header).right + 1,
                  title: rect(title),
                  badge: rect(badge),
                  date: rect(date),
                };
              });
              return {
                valid: cards.length >= 3 && cards.every((c) => c.valid),
                cards,
              };
            }
            if (route === "investments") {
              const block = document.querySelector(".report-period-meta")!;
              const scope = block.querySelector(".status-meta")!;
              const date = scope.querySelector("time")!;
              const badge = scope.querySelector(".status-badge")!;
              const note = block.querySelector("p")!;
              const monthStates = Array.from(
                document.querySelectorAll(".investment-table .status-stack"),
              ).filter((row) => row.querySelector(".status-badge"));
              return {
                valid:
                  !overlaps(date, badge) &&
                  rect(note).y >= rect(scope).bottom + 6 &&
                  !note.querySelector(".status-badge") &&
                  monthStates.every(
                    (row) =>
                      rect(row.querySelector(".status-badge")!).y >=
                      rect(row.querySelector("time")!).bottom + 5,
                  ),
                date: rect(date),
                badge: rect(badge),
                note: rect(note),
              };
            }
            const header = document.querySelector(".goal-card-top")!;
            const title = header.firstElementChild!;
            const badge = header.querySelector(".status-badge")!;
            return {
              valid:
                !overlaps(title, badge) &&
                rect(badge).right <= rect(header).right + 1,
              detached: document.querySelectorAll(
                ".heading-copy > .status-badge",
              ).length,
              title: rect(title),
              badge: rect(badge),
            };
          }, route);
          expect(
            geometry.valid,
            `${route}/${locale}/${mode}/${width}: ${JSON.stringify(geometry)}`,
          ).toBe(true);
          if ("detached" in geometry) expect(geometry.detached).toBe(0);
          measurements.push({ route, locale, mode, width, geometry });
          if (locale === "en" && [320, 1440].includes(width)) {
            const scope =
              route === "savings"
                ? page.locator(".savings-toolbar")
                : route === "income"
                  ? page.locator(".income-list")
                  : route === "investments"
                    ? page.locator(".report-period-meta")
                    : page.locator(".goal-grid");
            await scope.screenshot({
              path: info.outputPath(`placement-${route}-${mode}-${width}.png`),
            });
          }
        }
      }
    }
  }
  await info.attach("status-placement-geometry", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
});
