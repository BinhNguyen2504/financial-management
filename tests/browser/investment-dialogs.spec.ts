import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { investmentClock } from "../../src/domain/investments/engine";

import postgres from "postgres";
import {
  buildReviewData,
  buildReviewSQL,
} from "../../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "../../scripts/lib/savings-review-data.mjs";
import { visualThemeKeys } from "../../src/components/visual-theme";

const today = investmentClock().today;
const discardTitle = "Đóng cửa sổ và bỏ nội dung chưa lưu?";
async function setup(page: Page) {
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  const nativeDialogs: string[] = [];
  page.on("dialog", (dialog) => {
    nativeDialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.goto("/login?next=/investments");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/investments$/);
  const ids = { asset: randomUUID(), cash: randomUUID(), other: randomUUID() };
  for (const [key, id] of Object.entries(ids)) {
    const v = await (await page.request.get("/api/v1/investments")).json();
    const response = await page.request.post("/api/v1/investments/commands", {
      headers: { origin: process.env.TEST_BASE_URL! },
      data: {
        id: randomUUID(),
        expectedVersion: v.book?.version ?? 0,
        action: {
          type: "createCategory",
          id,
          start: today,
          kind: key === "asset" ? "investment" : "cash",
          name: `Kiểm tra ${key}`,
          emoji: "🌱",
        },
      },
    });
    expect(response.ok()).toBe(true);
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Ghi giao dịch", exact: true }),
  ).toBeEnabled();
  return { ids, nativeDialogs, ownerId };
}
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Ghi giao dịch", exact: true });
}
async function discard(page: Page) {
  await page
    .getByRole("dialog", { name: discardTitle, exact: true })
    .getByRole("button", { name: "Bỏ thay đổi", exact: true })
    .click();
}

test("investment forms align every transaction type at narrow, tablet, desktop and short landscape sizes", async ({
  page,
}, info) => {
  await setup(page);
  const dialog = await open(page);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    for (const kind of [
      "buy",
      "sell",
      "deposit",
      "withdraw",
      "transfer",
      "openingCash",
      "openingInvestment",
      "valuation",
    ]) {
      await dialog
        .getByLabel("Loại giao dịch", { exact: true })
        .selectOption(kind);
      const measurements = await dialog.evaluate((element) => {
        const body = element.querySelector<HTMLElement>(".dialog-body")!;
        const controls = [
          ...element.querySelectorAll<HTMLInputElement>(
            ".investment-field input, .investment-field select",
          ),
        ];
        const fee = element
          .querySelector("#investment-fee")
          ?.getBoundingClientRect();
        const tax = element
          .querySelector("#investment-tax")
          ?.getBoundingClientRect();
        return {
          heights: controls.map((c) => c.getBoundingClientRect().height),
          overflow: body.scrollWidth - body.clientWidth,
          feeOffset: fee && tax ? Math.abs(fee.y - tax.y) : 0,
          firstOffset: Math.abs(
            controls[0].getBoundingClientRect().y -
              controls[1].getBoundingClientRect().y,
          ),
        };
      });
      expect(
        measurements.overflow,
        `${viewport.width}/${kind}`,
      ).toBeLessThanOrEqual(1);
      for (const height of measurements.heights)
        expect(Math.abs(height - 46), `${viewport.width}/${kind}`).toBeLessThan(
          1,
        );
      if (viewport.width >= 640) {
        expect(measurements.firstOffset).toBeLessThan(1);
        expect(measurements.feeOffset).toBeLessThan(1);
      }
    }
    await dialog
      .getByLabel("Loại giao dịch", { exact: true })
      .selectOption("buy");
    await dialog.locator(".dialog-body").evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: `artifacts/investment-dialog-${info.project.name}-${viewport.width}.png`,
    });
  }
});

test("investment validation is readable, targets fields and preserves valid and invalid numeric drafts", async ({
  page,
}) => {
  const { ids, nativeDialogs } = await setup(page);
  const dialog = await open(page);
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(dialog.locator("#investment-categoryId")).toBeFocused();
  await expect(dialog.locator(".app-toast")).toContainText(
    "Kiểm tra các trường được đánh dấu.",
  );
  await expect(dialog).not.toContainText(
    /invalid_format|Invalid UUID|"pattern"|"origin"/,
  );
  await dialog
    .locator('.form-error-summary a[href="#investment-value"]')
    .click();
  await expect(dialog.locator("#investment-value")).toBeFocused();
  await dialog
    .getByLabel("Danh mục / ví", { exact: true })
    .selectOption(ids.asset);
  const amount = dialog.getByLabel("Tiền mua trước phí/thuế (VND)", {
    exact: true,
  });
  await amount.fill("0");
  await dialog
    .getByLabel("Giá trị tài sản còn giữ sau giao dịch (VND)", { exact: true })
    .fill("0");
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(dialog.locator("#investment-error-amount")).toHaveText(
    "Số tiền phải lớn hơn 0.",
  );
  await amount.fill("9".repeat(25));
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(amount).toBeFocused();
  await expect(dialog.locator("#investment-error-amount")).toHaveText(
    "Nhập số nguyên VND không âm, tối đa 24 chữ số.",
  );
  await expect(
    dialog.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toHaveCount(0);
  await amount.fill("9".repeat(24));
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    dialog.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toBeVisible();
  await amount.fill("-1");
  await expect(
    dialog.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Đóng cửa sổ", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tiếp tục nhập", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Tiếp tục nhập", exact: true })
    .click();
  await expect(amount).toHaveValue("-1");
  await dialog
    .getByRole("button", { name: "Đóng cửa sổ", exact: true })
    .click();
  await discard(page);
  await expect(dialog).toBeHidden();
  expect(nativeDialogs).toEqual([]);
});

test("application discard confirmation handles X, Escape, backdrop, focus, scroll and reverted drafts", async ({
  page,
}) => {
  const { nativeDialogs } = await setup(page);
  const trigger = page.getByRole("button", {
    name: "Ghi giao dịch",
    exact: true,
  });
  let dialog = await open(page);
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  dialog = await open(page);
  // LocalizedInput holds this invalid raw draft while canonical amount stays empty.
  await dialog.locator("#investment-amount").fill("abc");
  await dialog.locator("#investment-note").fill("Giữ bản nháp");
  await dialog
    .getByRole("button", { name: "Đóng cửa sổ", exact: true })
    .focus();
  const scroll = await dialog.locator(".dialog-body").evaluate((el) => {
    const body = el as HTMLElement;
    body.style.scrollBehavior = "auto";
    body.scrollTo({ top: body.scrollHeight, behavior: "instant" });
    return body.scrollTop;
  });
  await page.keyboard.press("Enter");
  const confirmation = page.getByRole("dialog", {
    name: discardTitle,
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  expect((await confirmation.boundingBox())!.height).toBeLessThan(400);
  await expect(
    page.getByRole("button", { name: "Tiếp tục nhập", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Đóng cửa sổ", exact: true }),
  ).toBeFocused();
  expect(
    await dialog.locator(".dialog-body").evaluate((el) => el.scrollTop),
  ).toBeCloseTo(scroll, 0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: discardTitle, exact: true }),
  ).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#investment-note")).toHaveValue("Giữ bản nháp");
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await discard(page);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  dialog = await open(page);
  await dialog.locator("#investment-amount").fill("abc");
  await page.mouse.click(1, 1);
  await expect(
    page.getByRole("dialog", { name: discardTitle, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tiếp tục nhập", exact: true })
    .click();
  await dialog.locator("#investment-amount").fill("");
  await dialog
    .getByRole("button", { name: "Đóng cửa sổ", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(nativeDialogs).toEqual([]);
});

test("column pickers stay compact across modules and route changes", async ({
  page,
}) => {
  const { ownerId } = await setup(page);
  const db = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
    max: 1,
    onnotice: () => {},
  });
  try {
    const data = addSavingsReviewData(buildReviewData({ ownerId }));
    await db.unsafe(buildReviewSQL(data).seed);
    await db.unsafe(buildSavingsReviewSQL(data).seed);
  } finally {
    await db.end();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const path of [
    "/investments",
    "/savings",
    "/income",
    "/budgets",
    "/funds",
    "/investments",
  ]) {
    await page.goto(path);
    if (path === "/funds") continue; // No ColumnTable in Funds; still load its global CSS.
    if (path === "/savings")
      await page.getByRole("tab", { name: "Báo cáo", exact: true }).click();
    if (path === "/income")
      await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
    if (path === "/budgets") {
      await page
        .getByRole("button", { name: "Báo cáo năm", exact: true })
        .click();
      await page.getByRole("button", { name: "Bảng", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Cột hiển thị", exact: true })
      .first()
      .click();
    const popup = page.locator(".column-picker-options:popover-open");
    const geometry = await popup
      .locator(".column-picker-row")
      .first()
      .evaluate((row) => {
        const box = row.querySelector("input")!.getBoundingClientRect();
        return {
          display: getComputedStyle(row).display,
          height: box.height,
          width: box.width,
          rowHeight: row.getBoundingClientRect().height,
        };
      });
    expect(geometry).toEqual({
      display: "flex",
      height: 20,
      width: 34,
      rowHeight: 44,
    });
    const toggle = popup.getByRole("checkbox").first();
    const initial = await toggle.isChecked();
    await toggle.press("Space");
    await expect(toggle).toBeChecked({ checked: !initial });
    await toggle.press("Escape");
    await expect(popup).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Cột hiển thị", exact: true }).first(),
    ).toBeFocused();
  }
});

test("investment dialog supports both languages, five themes, light/dark and enlarged text", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await setup(page);
  await open(page);
  for (const locale of ["vi", "en"]) {
    await page.evaluate((value) => {
      localStorage.setItem("fm-locale", value);
      window.dispatchEvent(
        new CustomEvent("fm-locale-change", { detail: value }),
      );
    }, locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    for (const theme of visualThemeKeys)
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            localStorage.setItem("fm-visual-theme", theme);
            localStorage.setItem("fm-theme", mode);
            window.dispatchEvent(new Event("fm-preference-change"));
          },
          { theme, mode },
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-visual-theme",
          theme,
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const dialog = page.getByRole("dialog");
          await expect(
            dialog.locator("#investment-transactionKind option"),
          ).toHaveText(
            locale === "vi"
              ? [
                  "Số dư ví mở đầu",
                  "Tài sản mở đầu",
                  "Nạp tiền",
                  "Rút tiền",
                  "Chuyển ví",
                  "Mua",
                  "Bán",
                  "Định giá",
                ]
              : [
                  "Opening wallet balance",
                  "Opening assets",
                  "Deposit cash",
                  "Withdraw cash",
                  "Transfer between wallets",
                  "Buy",
                  "Sell",
                  "Valuation",
                ],
          );
          await dialog.locator(".dialog-body").evaluate((el) => {
            el.scrollTop = 0;
          });
          await expect(
            dialog.getByRole("group", {
              name:
                locale === "vi" ? "Thông tin giao dịch" : "Transaction details",
              exact: true,
            }),
          ).toBeVisible();
          expect(
            await dialog
              .locator(".dialog-body")
              .evaluate((el) => el.scrollWidth - el.clientWidth),
          ).toBeLessThanOrEqual(1);
          await page.screenshot({
            path: `artifacts/investment-dialog-matrix-${info.project.name}-${locale}-${theme}-${mode}-${width}.png`,
          });
        }
      }
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const dialog = page.getByRole("dialog");
  expect(
    await dialog
      .locator(".dialog-body")
      .evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(
    await dialog
      .locator("#investment-amount")
      .evaluate(
        (el) =>
          el.clientHeight >= parseFloat(getComputedStyle(el).lineHeight) + 18,
      ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Close form", exact: true }).focus();
  await expect(
    dialog.getByRole("button", { name: "Close form", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: `artifacts/investment-dialog-text-200-${info.project.name}.png`,
  });
});
