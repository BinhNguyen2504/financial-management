import { test, expect, type Page } from "@playwright/test";
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

async function review(page: Page) {
  await page.goto("/login?next=/budgets");
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
  await expect(page).toHaveURL(/\/budgets$/);
  await expect(
    page.getByRole("button", { name: "Chọn tháng bắt đầu", exact: true }),
  ).toBeVisible();
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
  try {
    const sample = addSavingsReviewData(buildReviewData({ ownerId }));
    await admin.unsafe(buildReviewSQL(sample).seed);
    await admin.unsafe(buildSavingsReviewSQL(sample).seed);
  } finally {
    await admin.end();
  }
  await page.goto("/budgets");
  await expect(
    page.getByRole("button", { name: "Du lịch", exact: true }),
  ).toBeVisible();
}

test("stacked dialogs return to details and labels with focus and scroll intact", async ({
  page,
  isMobile,
}) => {
  await review(page);
  const trigger = page.getByRole("button", { name: "Du lịch", exact: true });
  await (isMobile ? trigger.tap() : trigger.click());
  const parent = page.locator("dialog").filter({
    has: page.locator("h2").filter({ hasText: /^Du lịch$/ }),
  });
  const edit = parent.getByRole("button", {
    name: "Đổi biểu tượng",
    exact: true,
  });
  for (const dismiss of ["cancel", "outside", "escape"] as const) {
    await (isMobile ? edit.tap() : edit.click());
    const scroll = await parent
      .locator(".dialog-body")
      .evaluate((el) => el.scrollTop);
    const ids = await page
      .locator("dialog[open]")
      .evaluateAll((ds) => ds.map((d) => d.getAttribute("aria-labelledby")));
    expect(new Set(ids).size).toBe(2);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "Đổi biểu tượng",
    );
    await page
      .getByRole("heading", { name: "Đổi biểu tượng", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    if (dismiss === "cancel") {
      const cancel = page.getByRole("button", { name: "Hủy", exact: true });
      await (isMobile ? cancel.tap() : cancel.click());
    }
    if (dismiss === "outside")
      await (isMobile ? page.touchscreen.tap(2, 2) : page.mouse.click(2, 2));
    if (dismiss === "escape") await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveAccessibleName("Du lịch");
    await expect(edit).toBeFocused();
    expect(
      await parent.locator(".dialog-body").evaluate((el) => el.scrollTop),
    ).toBe(scroll);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
  }
  await page.mouse.click(2, 2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );

  await page.getByRole("button", { name: "Phân loại", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm phân loại", exact: true })
    .click();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Phương thức và nhóm",
  );
  await page.keyboard.press("Escape");
});

test("income edit and delete cancellation return to the report detail", async ({
  page,
}) => {
  await review(page);
  await page.goto("/income");
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await page
    .getByRole("button", { name: "Thu phát sinh · xem chi tiết", exact: true })
    .click();
  const parent = page.getByRole("dialog", {
    name: "Thu phát sinh trong kỳ",
    exact: true,
  });
  const before = await parent.innerText();
  for (const action of ["Sửa", "Xóa"]) {
    await parent
      .getByRole("button", { name: new RegExp(`^${action} `) })
      .first()
      .click();
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    await expect(parent).toBeVisible();
    expect(await parent.innerText()).toBe(before);
  }
  await page.mouse.click(2, 2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("outside and Escape cannot interrupt a pending save; dragging out does not dismiss", async ({
  page,
}) => {
  await review(page);
  await page.getByRole("button", { name: "Du lịch", exact: true }).click();
  await page
    .getByRole("button", { name: "Đổi biểu tượng", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const box = (await dialog.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(2, 2);
  await page.mouse.up();
  await expect(dialog).toHaveAccessibleName("Đổi biểu tượng");
  await dialog.getByRole("button", { name: "Quà tặng", exact: true }).click();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/expenses/preview", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page
      .getByRole("button", { name: "Xem trước thay đổi", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Đang kiểm tra…", exact: true }),
    ).toBeDisabled();
    await page.mouse.click(2, 2);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveAccessibleName("Đổi biểu tượng");
  } finally {
    release();
  }
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Du lịch");
  await page.keyboard.press("Escape");
});

test("financial layouts align values and actions across themes and viewport sizes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await review(page);
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const widths =
      info.project.name === "desktop"
        ? [320, 768, 1024, 1440, 1920]
        : [page.viewportSize()!.width];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "budgets",
        "income",
        "savings",
        "goals",
        "accounts",
        "reports",
      ]) {
        await page.goto(`/${route}`);
        await expect(page.locator("main h1")).toBeVisible();
        if (route === "budgets")
          await expect(
            page.getByRole("button", { name: "Du lịch", exact: true }),
          ).toBeVisible();
        if (route === "income")
          await expect(
            page.getByRole("button", { name: "Nhập Lương FSOFT", exact: true }),
          ).toBeVisible();
        if (route === "savings")
          await expect(
            page.getByRole("button", {
              name: "Chi tiết Techcombank",
              exact: true,
            }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route}/${width}/${colorScheme}`,
        ).toBe(true);
        if (route === "budgets" && width >= 768) {
          const alignment = await page
            .locator(".expense-desktop-table")
            .evaluate((el) => {
              const head = el.querySelectorAll("thead th");
              return [...el.querySelectorAll("tbody tr")].map((row) => {
                const cells = row.querySelectorAll("td");
                const range = document.createRange();
                range.selectNodeContents(cells[0]);
                const value = range.getBoundingClientRect();
                const header = head[1].getBoundingClientRect();
                const action = cells[6]
                  .querySelector("button")!
                  .getBoundingClientRect();
                return {
                  headerGap: Math.abs(
                    value.right -
                      (header.right -
                        parseFloat(getComputedStyle(head[1]).paddingRight)),
                  ),
                  centerGap: Math.abs(
                    value.y + value.height / 2 - action.y - action.height / 2,
                  ),
                  actionX: action.x,
                };
              });
            });
          expect(
            alignment.every((a) => a.headerGap < 2 && a.centerGap < 2),
            JSON.stringify(alignment),
          ).toBe(true);
          expect(new Set(alignment.map((a) => a.actionX)).size).toBe(1);
        }
        if (width === 1440 || info.project.name !== "desktop")
          await page.screenshot({
            path: info.outputPath(`${route}-${colorScheme}.png`),
            fullPage: true,
          });
      }
    }
  }
  // Reproduce the long error + retry shown in the feedback.
  await page.route("**/api/v1/savings**", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error:
          "Không thể truy cập dữ liệu. Kiểm tra kết nối rồi thử lại; nội dung đang nhập được giữ.",
      },
    }),
  );
  await page.goto("/savings");
  const alert = page.locator("main").getByRole("alert");
  await expect(
    alert.getByRole("button", { name: "Thử lại", exact: true }),
  ).toBeVisible();
  const gap = await alert.evaluate((el) => {
    const p = el.querySelector("p")!.getBoundingClientRect(),
      b = el.querySelector("button")!.getBoundingClientRect();
    return b.y >= p.bottom ? b.y - p.bottom : b.x - p.right;
  });
  expect(gap).toBeGreaterThanOrEqual(12);
  await page.screenshot({
    path: info.outputPath("savings-error.png"),
    fullPage: true,
  });
  await page.unroute("**/api/v1/savings**");
  await alert.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chi tiết Techcombank", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chi tiết Techcombank", exact: true })
    .click();
  await page.mouse.click(2, 2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
