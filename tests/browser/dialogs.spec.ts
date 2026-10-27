import { test, expect, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  emptyBook,
  savingsClock,
  toView,
} from "../../src/domain/savings/engine";
import { transactionSchema } from "../../src/domain/savings/schema";
import {
  buildReviewData,
  buildReviewSQL,
} from "../../scripts/lib/review-data.mjs";
import {
  buildInvestmentReviewData,
  buildInvestmentReviewSQL,
} from "../../scripts/lib/investment-review-data.mjs";

async function login(page: Page, next = "savings") {
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto(`/login?next=/${next}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(new RegExp(`/${next}$`));
  await expect(page.locator("main h1")).toBeVisible();
  if (next === "investments" || next === "savings")
    await expect(
      page.getByRole("button", { name: "Tải lại", exact: true }),
    ).toBeEnabled();
  else
    await expect(
      page.getByRole("button", { name: "Nhập thu nhập", exact: true }),
    ).toBeVisible();
  return ownerId;
}

function denseSavings(count: number) {
  const today = savingsClock().today;
  const book = emptyBook();
  for (const kind of ["cash", "gold", "deposit"] as const) {
    const id = randomUUID();
    book.categories.push({
      id,
      kind,
      start: today.slice(0, 7),
      unit: kind === "gold" ? "chỉ" : null,
      rules: [
        {
          month: today.slice(0, 7),
          name: `Kiểm thử ${kind}`,
          description: "Dữ liệu tổng hợp kiểm thử bố cục. ".repeat(12),
          emoji: "🌱",
          active: true,
        },
      ],
    });
    for (let index = 0; index < count; index++) {
      const transaction = transactionSchema.parse({
        id: randomUUID(),
        categoryId: id,
        date: today,
        kind:
          kind === "cash"
            ? "deposit"
            : kind === "gold"
              ? "openingGold"
              : "openingDeposit",
        ...(kind === "gold"
          ? {
              amount: "9007199254740993",
              quantity: "0.123456",
              unitPrice: "17400000",
            }
          : kind === "deposit"
            ? {
                amount: "9007199254740993",
                name: `Sổ kiểm thử ${index}`,
                maturity: "2099-12-01",
              }
            : { amount: "9007199254740993" }),
        note: `Nội dung kiểm thử ${index}. ${"Ghi chú dài cần đọc đầy đủ. ".repeat(12)}`,
      });
      book.revisions.push({
        id: transaction.id,
        rootId: transaction.id,
        sequence: ++book.version,
        transaction,
        reason: "",
      });
    }
  }
  return toView(book, today, { today, now: `${today}T00:00:00Z` });
}

async function noHorizontalOverflow(dialog: Locator) {
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  expect(
    await dialog
      .locator(".dialog-body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
}

test("dense savings dialogs paginate boundaries, retain nested context, expose headings and fit both themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await login(page);
  let fixture = denseSavings(0);
  // Synthetic response only; the fixture is never written to account or cloud storage.
  await page.route(/\/api\/v1\/savings\?/, (route) =>
    route.fulfill({ json: fixture }),
  );
  for (const count of [0, 1, 20, 21, 221]) {
    fixture = denseSavings(count);
    await page.goto("/savings");
    await page
      .getByRole("button", { name: "Chi tiết Kiểm thử cash", exact: true })
      .click();
    const parent = page.getByRole("dialog");
    await expect(parent.locator(".dialog-result-count")).toContainText(
      `${count} / ${count}`,
    );
    await expect(parent.locator("tbody tr")).toHaveCount(Math.min(count, 20));
    if (count > 20) {
      await parent
        .getByRole("button", { name: "Trang sau", exact: true })
        .click();
      await expect(parent.locator("tbody tr")).toHaveCount(
        Math.min(count - 20, 20),
      );
      await expect(
        parent.getByText(`Trang 2 / ${Math.ceil(count / 20)}`, { exact: true }),
      ).toBeVisible();
      await parent.getByRole("searchbox").fill("không tìm thấy");
      await expect(parent.getByText(/Không có kết quả phù hợp/)).toBeVisible();
      await parent.getByRole("searchbox").fill("noi dung kiem thu");
      await expect(
        parent.getByText(`Trang 1 / ${Math.ceil(count / 20)}`, { exact: true }),
      ).toBeVisible();
      await parent
        .getByRole("button", { name: "Trang sau", exact: true })
        .click();
      const trigger = parent
        .getByRole("button", { name: "Xem giao dịch", exact: true })
        .first();
      await trigger.click();
      await expect(page.getByRole("dialog")).toHaveAccessibleName(
        "Chi tiết giao dịch tiết kiệm",
      );
      await page
        .getByRole("button", { name: "Sửa giao dịch", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveAccessibleName(
        "Sửa giao dịch có lịch sử",
      );
      const footer = page.getByRole("dialog").locator(".dialog-footer");
      await expect(
        footer.getByRole("button", { name: "Hủy", exact: true }),
      ).toBeInViewport();
      await footer.getByRole("button", { name: "Hủy", exact: true }).click();
      await page.getByRole("button", { name: "Đóng", exact: true }).click();
      await expect(trigger).toBeFocused();
      await expect(
        page
          .getByRole("dialog")
          .getByText(`Trang 2 / ${Math.ceil(count / 20)}`, { exact: true }),
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");
  }
  await page
    .getByRole("button", { name: "Chi tiết Kiểm thử gold", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: /Đợt vàng/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    dialog.getByText("0,123456 chỉ", { exact: true }).first(),
  ).toBeVisible();
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const widths =
      info.project.name === "desktop"
        ? [320, 375, 768, 1024, 1440]
        : [page.viewportSize()!.width];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await noHorizontalOverflow(dialog);
      const y = (await dialog.getByRole("heading", { level: 2 }).boundingBox())!
        .y;
      await dialog.locator(".dialog-body").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      expect(
        (await dialog.getByRole("heading", { level: 2 }).boundingBox())!.y,
      ).toBe(y);
      await expect(
        dialog.getByRole("button", { name: "Đóng", exact: true }),
      ).toBeInViewport();
    }
    await dialog.locator(".dialog-body").evaluate((el) => {
      el.scrollTop = 0;
    });
    await dialog.screenshot({
      path: info.outputPath(`gold-detail-${colorScheme}.png`),
    });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  // Emulate 200% text enlargement without disabling responsive CSS or zoom.
  await dialog.evaluate((el) => {
    const sizes = [
      ...el.querySelectorAll<HTMLElement>(
        "h2,h3,p,dt,dd,th,td,button,label,input,select,strong,summary",
      ),
    ].map(
      (node) => [node, parseFloat(getComputedStyle(node).fontSize)] as const,
    );
    sizes.forEach(([node, size]) => {
      node.style.fontSize = `${size * 2}px`;
    });
  });
  await noHorizontalOverflow(dialog);
  await dialog.locator(".dialog-body").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    dialog.getByRole("button", { name: "Đóng", exact: true }),
  ).toBeInViewport();
  await dialog.screenshot({
    path: info.outputPath("gold-detail-200-percent-text.png"),
  });
  await dialog.evaluate((el) =>
    el
      .querySelectorAll<HTMLElement>("[style]")
      .forEach((node) => node.style.removeProperty("font-size")),
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await noHorizontalOverflow(dialog);
  await expect(
    dialog.getByRole("button", { name: "Đóng", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 375, height: 812 });
  await dialog.getByRole("tab", { name: /Đợt vàng/ }).focus();
  await page.keyboard.press("End");
  await expect(dialog.getByRole("tab", { name: /Giao dịch/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Chi tiết Kiểm thử deposit", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("tab", { name: /Sổ tiền gửi/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(dialog.locator("tbody tr:visible")).toHaveCount(20);
  await noHorizontalOverflow(dialog);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Chi tiết Kiểm thử gold", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText("0,123456");
  await expect(page.getByRole("dialog")).not.toContainText(
    "9.007.199.254.740.993",
  );
});

test("investment edit saves back into the transaction and category without losing search or focus", async ({
  page,
}) => {
  const ownerId = await login(page, "investments");
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
  try {
    await admin.unsafe(
      buildInvestmentReviewSQL(buildInvestmentReviewData({ ownerId })).seed,
    );
  } finally {
    await admin.end();
  }
  await page.reload();
  await page.getByRole("button", { name: /Chi tiết Tiền chờ TCBS/ }).click();
  const parentId = await page
    .getByRole("dialog")
    .getAttribute("aria-labelledby");
  const parent = page.locator(`dialog[aria-labelledby="${parentId}"]`);
  await parent.getByRole("searchbox").fill("mẫu");
  const trigger = parent
    .getByRole("button", { name: "Xem giao dịch", exact: true })
    .first();
  await trigger.click();
  await page
    .getByRole("button", { name: "Sửa giao dịch", exact: true })
    .click();
  const editorId = await page
    .getByRole("dialog")
    .getAttribute("aria-labelledby");
  const editor = page.locator(`dialog[aria-labelledby="${editorId}"]`);
  await editor
    .getByLabel("Ghi chú giao dịch", { exact: true })
    .fill("Ghi chú mẫu cập nhật để kiểm thử giữ ngữ cảnh");
  await editor
    .getByLabel("Lý do sửa / hủy", { exact: true })
    .fill("Kiểm thử giữ ngữ cảnh");
  await editor
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    editor.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Chi tiết giao dịch",
  );
  await page.getByRole("tab", { name: /Lịch sử chỉnh sửa/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Kiểm thử giữ ngữ cảnh");
  await page.keyboard.press("Escape");
  await expect(parent.getByRole("searchbox")).toHaveValue("mẫu");
  await expect(trigger).toBeFocused();
});

test("income details retain their list after save and expenses keep tab context", async ({
  page,
}, info) => {
  const ownerId = await login(page, "income");
  const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
  try {
    await admin.unsafe(buildReviewSQL(buildReviewData({ ownerId })).seed);
  } finally {
    await admin.end();
  }
  await page.reload();
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await page
    .getByRole("button", { name: "Thu phát sinh · xem chi tiết", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("searchbox").fill(" ");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Sửa / })
    .first()
    .click();
  const editorId = await page
    .getByRole("dialog")
    .getAttribute("aria-labelledby");
  const editor = page.locator(`dialog[aria-labelledby="${editorId}"]`);
  await editor.getByLabel("Mô tả (tùy chọn)").fill("Đã sửa trong chi tiết");
  await editor.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Thu phát sinh trong kỳ",
  );
  await expect(page.getByRole("dialog")).toContainText("Đã sửa trong chi tiết");
  await page.keyboard.press("Escape");
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Du lịch", exact: true }).click();
  const parent = page.getByRole("dialog");
  await parent.getByRole("tab", { name: /Các lần sử dụng/ }).click();
  await expect(
    parent.getByRole("heading", { name: /Các lần sử dụng/ }),
  ).toBeVisible();
  await parent
    .getByRole("button", { name: "Đổi biểu tượng", exact: true })
    .click();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(
    parent.getByRole("tab", { name: /Các lần sử dụng/ }),
  ).toHaveAttribute("aria-selected", "true");
  await parent.screenshot({ path: info.outputPath("expense-detail.png") });
});
