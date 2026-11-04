import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { completeTestEmailLogin } from "./helpers/test-email-login";
import { restoreBlockers } from "../../src/domain/backup/status";

function occupiedStatus() {
  return {
    ownerId: randomUUID(),
    empty: false,
    importReady: true,
    resetReady: true,
    dataGeneration: 0,
    maxBytes: 20 * 1024 * 1024,
    reasons: ["ACCOUNT_NOT_EMPTY"],
    blockers: restoreBlockers({
      expense_books: 1,
      expense_jars: 18,
      expense_audit: 227,
      income_books: 1,
      income_commands: 50,
      savings_books: 1,
      savings_transactions: 135,
      investments_books: 1,
      investments_transactions: 53,
      funds_books: 1,
      funds_transactions: 98,
    }),
  };
}

async function login(page: Page) {
  await page.goto("/login?next=/settings");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("radio", { name: "Tiếng Việt", exact: true }),
  ).toBeVisible();
}

test("section heading keeps Help separated from its description in both languages", async ({
  page,
}, info) => {
  await page.route("**/api/v1/data/status", (route) =>
    route.fulfill({ json: occupiedStatus() }),
  );
  await login(page);
  const heading = page.locator(".settings-section-heading");
  for (const locale of ["Tiếng Việt", "English"]) {
    await page.getByRole("radio", { name: locale, exact: true }).check();
    for (const width of [1440, 1100, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fontSize of ["100%", "200%"]) {
        await page.evaluate((value) => {
          document.documentElement.style.fontSize = value;
        }, fontSize);
        const geometry = await heading.evaluate((element) => {
          const b = element.querySelector("button")!.getBoundingClientRect();
          const p = element.querySelector("p")!.getBoundingClientRect();
          return {
            gap: p.top - b.bottom,
            buttonHeight: b.height,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        if (
          locale === "Tiếng Việt" &&
          fontSize === "100%" &&
          [1440, 390].includes(width)
        ) {
          await page.screenshot({
            path: info.outputPath(`settings-${width}.png`),
            fullPage: true,
          });
        }
        expect(
          geometry.gap,
          `${locale}/${width}/${fontSize}`,
        ).toBeGreaterThanOrEqual(15.5);
        expect(geometry.buttonHeight).toBeGreaterThanOrEqual(44);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
      }
    }
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "100%";
  });
  const trigger = heading.getByRole("button");
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("occupied account presents module states before optional record details", async ({
  page,
}, info) => {
  await page.route("**/api/v1/data/status", (route) =>
    route.fulfill({ json: occupiedStatus() }),
  );
  await login(page);
  const status = page.locator(".restore-status");
  await expect(status).toContainText("5 mục có dữ liệu");
  await expect(status).toContainText("1 mục trống");
  await expect(status.locator(".restore-blockers > *")).toHaveCount(6);
  await expect(status.locator(".restore-blockers details[open]")).toHaveCount(
    0,
  );
  await expect(
    status.locator(".restore-record-total").first(),
  ).not.toBeVisible();
  for (const summary of await status
    .locator(".restore-blockers summary")
    .all()) {
    await expect(summary).not.toContainText(/bản ghi|246|136/);
  }
  const income = status.locator('details[data-module="income"]');
  await income.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(income.locator(".restore-module-body")).toBeVisible();
  await expect(income).toContainText("51 bản ghi lưu trữ");
  await expect(income).toContainText("không phải số giao dịch");
  await expect(
    income.getByRole("link", { name: "Mở mục để xem dữ liệu", exact: true }),
  ).toHaveAttribute("href", "/income");
  await expect(page.locator("#backup-file")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tải bản sao lưu", exact: true }),
  ).toBeEnabled();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const fontSize of ["100%", "200%"]) {
      await page.evaluate((value) => {
        document.documentElement.style.fontSize = value;
      }, fontSize);
      expect(
        await status.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      for (const summary of await status
        .locator(".restore-blockers summary")
        .all()) {
        const box = (await summary.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "100%";
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: info.outputPath("restore-details-390.png"),
    fullPage: true,
  });
  await status
    .getByRole("link", { name: "Xem cách làm trống tài khoản", exact: true })
    .click();
  await expect(page.locator("#reset-data h3")).toBeInViewport();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("system readiness and account data stay independent and fully translated", async ({
  page,
}) => {
  let data = { ...occupiedStatus(), importReady: false, resetReady: false };
  await page.route("**/api/v1/data/status", (route) =>
    route.fulfill({ json: data }),
  );
  await login(page);
  const status = page.locator(".restore-status");
  await expect(status).toContainText("Tài khoản đang có dữ liệu");
  await expect(status.getByText(/Khôi phục chưa được bật/)).toBeVisible();
  await expect(page.locator("#backup-file")).toBeDisabled();
  await expect(page.locator("#reset-data button")).toBeDisabled();
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(status).toContainText("5 modules with data");
  await expect(status).toContainText("1 empty module");
  const income = status.locator('details[data-module="income"]');
  await income.locator("summary").click();
  await expect(income).toContainText("51 stored records");
  await expect(income).toContainText("not transaction counts");
  await expect(status).not.toContainText(
    /mục có dữ liệu|bản ghi lưu trữ|Có dữ liệu|Trống/,
  );
  data = {
    ...data,
    empty: true,
    blockers: restoreBlockers({}),
    reasons: ["IMPORT_NOT_READY"],
  };
  await status
    .getByRole("button", { name: "Check again", exact: true })
    .click();
  await expect(status).toContainText("This account has no financial data");
  await expect(status.locator(".restore-blockers")).toHaveCount(0);
  await expect(status.getByText(/Restore is not enabled/)).toBeVisible();
  await expect(page.locator("#backup-file")).toBeDisabled();
});

test("refresh preserves expanded details and enables restore only when eligible", async ({
  page,
}) => {
  let data = occupiedStatus();
  await page.route("**/api/v1/data/status", (route) =>
    route.fulfill({ json: data }),
  );
  await login(page);
  const status = page.locator(".restore-status");
  const income = status.locator('details[data-module="income"]');
  await income.locator("summary").click();
  data = { ...data, blockers: restoreBlockers({ income_commands: 52 }) };
  await status
    .getByRole("button", { name: "Kiểm tra lại", exact: true })
    .click();
  await expect(income).toHaveAttribute("open", "");
  await expect(income).toContainText("52 bản ghi lưu trữ");
  data = { ...data, empty: true, blockers: restoreBlockers({}), reasons: [] };
  await status
    .getByRole("button", { name: "Kiểm tra lại", exact: true })
    .click();
  await expect(status).toContainText("Tài khoản chưa có dữ liệu tài chính");
  await expect(page.locator("#backup-file")).toBeEnabled();
  await expect(
    status.getByRole("link", {
      name: "Xem cách làm trống tài khoản",
      exact: true,
    }),
  ).toHaveCount(0);
});
