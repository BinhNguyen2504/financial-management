import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { completeTestEmailLogin } from "./helpers/test-email-login";
import { visualThemeKeys } from "../../src/components/visual-theme";
import { vietnamClock } from "../../src/domain/shared/clock";
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

const viewports = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1000 },
  { width: 390, height: 844 },
  { width: 320, height: 700 },
  { width: 844, height: 390 },
];

async function login(page: Page, path = "/goals") {
  let owner = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    owner = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto(`/login?next=${path}`);
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  if (path === "/goals")
    await expect(page.locator(".goal-empty")).toBeVisible();
  return owner;
}

async function separated(group: Locator, gap = 8) {
  await expect(group).toBeVisible();
  const geometry = await group.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const controls = [
      ...element.querySelectorAll<HTMLElement>(":scope > button, :scope > a"),
    ]
      .filter((e) => e.getClientRects().length > 0)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return {
          label: e.textContent || e.getAttribute("aria-label"),
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          height: r.height,
        };
      });
    return { left: bounds.left, right: bounds.right, controls };
  });
  for (const [index, control] of geometry.controls.entries()) {
    expect(control.height, String(control.label)).toBeGreaterThanOrEqual(43.5);
    expect(control.x, String(control.label)).toBeGreaterThanOrEqual(
      geometry.left - 1,
    );
    expect(control.right, String(control.label)).toBeLessThanOrEqual(
      geometry.right + 1,
    );
    for (const other of geometry.controls.slice(index + 1)) {
      const dx = Math.max(control.x - other.right, other.x - control.right, 0);
      const dy = Math.max(
        control.y - other.bottom,
        other.y - control.bottom,
        0,
      );
      expect(
        Math.hypot(dx, dy),
        `${control.label} / ${other.label}`,
      ).toBeGreaterThanOrEqual(gap - 0.5);
    }
  }
  return geometry;
}

async function contentGap(container: Locator) {
  await expect(container).toBeVisible();
  const gap = await container.evaluate((e) => {
    const p = e.querySelector("p")!.getBoundingClientRect();
    const b = e
      .querySelector("button, a.expense-primary, a.expense-secondary")!
      .getBoundingClientRect();
    // Responsive feedback may put the action beside the copy or underneath it.
    return Math.max(b.top - p.bottom, b.left - p.right, p.left - b.right);
  });
  expect(gap).toBeGreaterThanOrEqual(15.5);
}

test("empty state and two-button footer have real spacing at every viewport", async ({
  page,
}, info) => {
  await login(page);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await contentGap(page.locator(".goal-empty"));
    await page
      .getByRole("button", { name: "Tạo mục tiêu đầu tiên", exact: true })
      .click();
    await separated(page.locator(".dialog-footer-actions"), 12);
    if (viewport.width === 1440 || viewport.width === 390) {
      await page.screenshot({
        path: info.outputPath(`goals-${viewport.width}.png`),
      });
    }
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Tạo mục tiêu đầu tiên", exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("three-button preview and nested discard preserve order, draft and focus", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Tạo mục tiêu", exact: true }).click();
  const parent = page.locator("dialog").first();
  await parent.getByLabel("Tên mục tiêu", { exact: true }).fill("Mua xe");
  await parent
    .getByLabel("Số tiền đích (VND)", { exact: true })
    .fill("100000000");
  await parent
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    parent.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const footer = parent.locator(".dialog-footer-actions");
    const geometry = await separated(footer, 12);
    expect(geometry.controls).toHaveLength(3);
    if (viewport.width <= 640) {
      expect(geometry.controls[2].y).toBeGreaterThanOrEqual(
        Math.max(...geometry.controls.slice(0, 2).map((c) => c.bottom)) + 11.5,
      );
    }
  }
  await parent.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(parent.getByLabel("Tên mục tiêu", { exact: true })).toHaveValue(
    "Mua xe",
  );
  await parent.getByRole("button", { name: "Hủy", exact: true }).click();
  const child = page.locator(".dialog-confirm");
  await separated(child.locator(".dialog-footer-actions"), 12);
  await child
    .getByRole("button", { name: "Tiếp tục nhập", exact: true })
    .click();
  await expect(child).toHaveCount(0);
  await expect(parent.getByLabel("Tên mục tiêu", { exact: true })).toHaveValue(
    "Mua xe",
  );
  await expect(
    parent.getByRole("button", { name: "Hủy", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("four-button footer wraps without changing keyboard order", async ({
  page,
  browserName,
}) => {
  await login(page, "/overview");
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const footer = page.locator(".dialog-footer-actions");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    expect((await separated(footer, 12)).controls).toHaveLength(4);
  }
  const buttons = footer.getByRole("button");
  await buttons.first().focus();
  for (let index = 1; index < 4; index++) {
    // WebKit on macOS uses Option-Tab to include buttons in native tab traversal.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(buttons.nth(index)).toBeFocused();
  }
  await footer.getByRole("button", { name: "Hủy", exact: true }).click();
});

test("retry actions are separated from errors and recover normally", async ({
  page,
}) => {
  await login(page);
  for (const feature of ["goals", "funds"]) {
    const path = `/api/v1/${feature}`;
    await page.route(`**${path}`, (route) => route.abort());
    await page.goto(`/${feature}`);
    const feedback = page.locator("main .expense-feedback[role=alert]");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await contentGap(feedback);
    }
    await page.unroute(`**${path}`);
    await feedback
      .getByRole("button", { name: "Thử tải lại", exact: true })
      .click();
    await expect(feedback).toHaveCount(0);
  }
});

test("fund setup separates its call to action, priority controls and three-button footer", async ({
  page,
}) => {
  await login(page, "/funds");
  await page.setViewportSize({ width: 320, height: 700 });
  await contentGap(page.locator(".fund-welcome"));
  const month = vietnamClock().today.slice(0, 7);
  for (const action of [
    { type: "initialize", start: month },
    {
      type: "createJar",
      id: randomUUID(),
      kind: "monthly",
      start: month,
      opening: "0",
      name: "Sinh hoạt thiết yếu",
      description: "",
      method: "Tiền mặt",
      group: "",
      amount: "9000000",
    },
  ]) {
    const view = await (await page.request.get("/api/v1/expenses")).json();
    const response = await page.request.post("/api/v1/expenses/commands", {
      headers: { origin: process.env.TEST_BASE_URL! },
      data: {
        id: randomUUID(),
        expectedVersion: view.book?.version ?? 0,
        action,
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Bắt đầu xây quỹ", exact: true })
    .click();
  await page.getByLabel(/Sinh hoạt thiết yếu/).check();
  const footer = page.locator(".dialog-footer-actions");
  await footer.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const [fund, value] of [
    ["Quỹ khẩn cấp", "6"],
    ["Quỹ phát sinh", "1"],
    ["Quỹ chi dự kiến", "2"],
  ]) {
    await page.getByLabel(`${fund} — hệ số x`, { exact: true }).fill(value);
  }
  await footer.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  expect((await separated(footer, 12)).controls).toHaveLength(3);
  for (const row of await page.locator(".fund-priorities li").all())
    await separated(row);
  await page
    .getByRole("button", { name: "Ưu tiên Quỹ phát sinh lên", exact: true })
    .click();
  await expect(page.locator(".fund-priorities li").first()).toContainText(
    "Quỹ phát sinh",
  );
  expect(
    (await (await page.request.get("/api/v1/funds")).json()).book,
  ).toBeNull();
  await footer.getByRole("button", { name: "Hủy", exact: true }).click();
});

test("footer spacing survives both locales, every theme and enlarged text", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  for (const locale of ["vi", "en"]) {
    await page
      .context()
      .addCookies([
        { name: "fm-locale", value: locale, url: process.env.TEST_BASE_URL! },
      ]);
    await page.reload();
    await expect(page.locator(".goal-empty button")).toBeEnabled();
    await page.locator(".goal-empty button").click();
    await page.setViewportSize({ width: 320, height: 700 });
    for (const theme of visualThemeKeys) {
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.visualTheme = theme;
            document.documentElement.dataset.theme = mode;
            document.documentElement.style.fontSize = "125%";
          },
          { theme, mode },
        );
        await separated(page.locator(".dialog-footer-actions"), 12);
      }
    }
    await page.locator(".dialog-footer-actions button").first().click();
    await contentGap(page.locator(".goal-empty"));
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const size of ["100%", "200%"]) {
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, size);
        const header = await page.locator(".topbar").evaluate((element) => {
          const boxes = [
            ...element.querySelectorAll<HTMLElement>(
              ".mobile-brand,.privacy-toggle,.user-menu > button,.mobile-menu > summary",
            ),
          ].map((e) => {
            const r = e.getBoundingClientRect();
            return {
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
            };
          });
          const brand = element.querySelector(".mobile-brand")!;
          const range = document.createRange();
          range.selectNodeContents(brand.lastElementChild!);
          const text = range.getBoundingClientRect();
          return {
            boxes,
            textRight: text.right,
            brandRight: brand.getBoundingClientRect().right,
            viewport: innerWidth,
          };
        });
        for (const [index, box] of header.boxes.entries()) {
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(header.viewport + 1);
          for (const other of header.boxes.slice(index + 1)) {
            const overlapX =
              Math.min(box.right, other.right) - Math.max(box.left, other.left);
            const overlapY =
              Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
            expect(overlapX > 0.5 && overlapY > 0.5).toBe(false);
          }
        }
        expect(header.textRight).toBeLessThanOrEqual(header.brandRight + 8);
        await page.locator(".user-trigger").click();
        const popover = page.locator(".user-popover");
        await expect(popover).toBeVisible();
        const popup = (await popover.boundingBox())!;
        const bar = (await page.locator(".topbar").boundingBox())!;
        expect(popup.y).toBeGreaterThanOrEqual(bar.y + bar.height);
        expect(popup.x).toBeGreaterThanOrEqual(0);
        expect(popup.x + popup.width).toBeLessThanOrEqual(width + 1);
        expect(popup.y + popup.height).toBeLessThanOrEqual(845);
        await page.keyboard.press("Escape");
        await expect(popover).toHaveCount(0);
      }
    }
  }
});

test("shared actions remain spaced across populated application pages and dialogs", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const owner = await login(page);
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
  for (const path of [
    "overview",
    "budgets",
    "income",
    "savings",
    "investments",
    "funds",
    "settings",
    "profile",
    "accounts",
    "reports",
    "transactions",
  ]) {
    await page.goto(`/${path}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main .loading-status")).toHaveCount(0);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const group of await page
        .locator(
          "main :is(.expense-actions,.fund-actions,.goal-actions,.settings-actions)",
        )
        .all()) {
        if (await group.isVisible()) await separated(group);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    await page.screenshot({
      path: info.outputPath(`${path}-320.png`),
      fullPage: true,
    });
    // Editors share the footer contract, including the single-button label manager.
    const opener =
      path === "budgets"
        ? "Phân loại"
        : path === "income"
          ? "Thêm thu phát sinh"
          : path === "savings" || path === "investments"
            ? "Ghi giao dịch"
            : path === "funds"
              ? "Điều chỉnh mục tiêu"
              : null;
    if (opener) {
      const trigger = page.getByRole("button", { name: opener, exact: true });
      await trigger.click();
      await separated(page.locator(".dialog-footer-actions").last(), 12);
      await page.keyboard.press("Escape");
    }
  }
});
