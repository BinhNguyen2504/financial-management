import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { visualThemeKeys } from "../../src/components/visual-theme";
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

test("financial headings balance illustrations, copy and controls across themes and viewport sizes", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login?next=/settings");
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
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("radio", { name: "Khu vườn — Xanh lục", exact: true }),
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "budgets",
    "income",
    "savings",
    "investments",
    "funds",
    // Goals uses a compact working header; covered in goals.spec.ts.
    "transactions",
    "accounts",
    "reports",
  ]) {
    await page.goto(`/${path}`);
    await page.waitForLoadState("networkidle");
    const header = page.locator(".illustrated-heading");
    const art = header.locator(".heading-art > .garden-art");
    await expect(header).toHaveCount(1);
    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute("aria-hidden", "true");
    await expect(art).toHaveAttribute("focusable", "false");
    for (const visual of visualThemeKeys)
      for (const mode of ["light", "dark"] as const) {
        await page.evaluate(
          ({ visual, mode }) => {
            localStorage.setItem("fm-visual-theme", visual);
            localStorage.setItem("fm-theme", mode);
            window.dispatchEvent(new Event("fm-preference-change"));
          },
          { visual, mode },
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-visual-theme",
          visual,
        );
        await expect(
          art.locator(`:scope > [data-visual-only="${visual}"]`),
        ).toBeVisible();
        for (const other of visualThemeKeys.filter((key) => key !== visual))
          await expect(
            art.locator(`:scope > [data-visual-only="${other}"]`),
          ).toBeHidden();
        expect(
          await art.evaluate((node) =>
            [node, ...node.querySelectorAll("*")].every(
              (n) => getComputedStyle(n).animationName === "none",
            ),
          ),
        ).toBe(true);
        if (path === "funds" && info.project.name === "desktop")
          await art.screenshot({
            path: `artifacts/illustrated-headings/safety-${visual}-${mode}.png`,
          });
      }
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "125%";
      });
      await expect(art).toBeVisible();
      const drawing = (await art.boundingBox())!;
      const copy = (await header.locator(".heading-copy").boundingBox())!;
      const frame = (await header.boundingBox())!;
      expect(drawing.width).toBeGreaterThanOrEqual(width <= 700 ? 210 : 238);
      expect(drawing.x).toBeGreaterThanOrEqual(frame.x - 1);
      expect(drawing.x + drawing.width).toBeLessThanOrEqual(
        frame.x + frame.width + 1,
      );
      if (width <= 700)
        expect(copy.y + copy.height).toBeLessThanOrEqual(drawing.y + 1);
      else expect(copy.x + copy.width).toBeLessThanOrEqual(drawing.x + 1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      for (const control of await header
        .locator(".heading-actions button")
        .all()) {
        await expect(control).toBeVisible();
        const box = (await control.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(frame.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(
          frame.x + frame.width + 1,
        );
        expect(box.y).toBeGreaterThanOrEqual(copy.y + copy.height - 1);
      }
      if (
        ["budgets", "income", "savings", "investments", "funds"].includes(
          path,
        ) &&
        [375, 1440].includes(width)
      )
        await header.screenshot({
          path: `artifacts/illustrated-headings/${info.project.name}-${path}-${width}.png`,
        });
    }
    await header
      .getByRole("button", { name: "Hướng dẫn", exact: true })
      .click();
    const help = page.locator("dialog.dialog-help");
    await expect(help).toBeVisible();
    await help.getByRole("button", { name: "Đóng", exact: true }).click();
    if (path === "budgets" || path === "funds") {
      await header
        .getByRole("button", {
          name: path === "budgets" ? "Phân loại" : "Điều chỉnh mục tiêu",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  }
  await page.goto("/");
  await expect(page.locator('[data-landing-audience="member"]')).toBeVisible();
  const finance: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/"))
      finance.push(request.url());
  });
  for (const name of [
    "Chi tiêu",
    "Thu nhập",
    "Tiết kiệm",
    "Đầu tư",
    "Quỹ an toàn",
  ]) {
    const preview = page.locator(".product-preview");
    await preview.getByRole("tab", { name, exact: true }).click();
    await expect(
      preview.locator(".preview-heading > .garden-art"),
    ).toBeVisible();
    await page.setViewportSize({ width: 320, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  expect(finance).toEqual([]);
  expect(errors).toEqual([]);
});
