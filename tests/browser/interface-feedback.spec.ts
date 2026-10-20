import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
import { paymentBrands } from "../../src/domain/expenses/label-visuals";

const today = vietnamClock().today,
  month = today.slice(0, 7),
  year = today.slice(0, 4);
async function login(page: Page, path = "/income") {
  await page.goto(`/login?next=${path}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.locator(".privacy-toggle")).toBeEnabled();
}
async function command(page: Page, module: string, action: unknown) {
  const view = await (
    await page.request.get(
      `/api/v1/${module}${module === "income" ? `?year=${year}` : ""}`,
    )
  ).json();
  const response = await page.request.post(`/api/v1/${module}/commands`, {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: view.book?.version ?? 0,
      action,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
async function previewAndSave(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
}

test("navigation, persistent appearance, installation guidance and profile return", async ({
  page,
}, info) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const navigation = page.locator(".sidebar .navigation");
  expect(
    (await navigation.locator(".navigation-name").allTextContents()).slice(
      0,
      7,
    ),
  ).toEqual([
    "Tổng quan",
    "Chi tiêu",
    "Thu nhập",
    "Tiết kiệm",
    "Đầu tư",
    "Quỹ an toàn",
    "Cài đặt",
  ]);
  await expect(
    navigation.getByRole("link", { name: /Mục tiêu/ }),
  ).toContainText("Đang phát triển");
  await page.getByRole("button", { name: "Thu gọn menu", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sidebar",
    "collapsed",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sidebar",
    "collapsed",
  );
  await page.getByRole("button", { name: "Mở rộng menu", exact: true }).click();
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Tối", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Tối", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "Sáng", exact: true }).check();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 243, 235)",
  );
  await page.getByRole("radio", { name: "Theo hệ thống", exact: true }).check();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(31, 37, 32)",
  );
  await page.locator(".settings-install > summary").click();
  for (const platform of ["iPhone / iPad", "Android", "Máy tính"]) {
    await page.getByRole("button", { name: platform, exact: true }).click();
    await expect(page.locator(".install-steps > li")).toHaveCount(4);
    await expect(page.locator(".install-steps svg")).toHaveCount(4);
  }
  await page.goto("/income");
  await page.getByRole("button", { name: /^Tài khoản của/ }).click();
  await page
    .getByRole("link", { name: "Thông tin cá nhân", exact: true })
    .click();
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(page).toHaveURL(/\/income$/);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/settings");
  await page.locator(".settings-install > summary").click();
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const privacy = page.locator(".privacy-toggle");
  await expect(privacy).toBeInViewport();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/feedback-shell-${info.project.name}.png`,
    fullPage: true,
  });
});

test("income missing cells, zero, unchanged drafts, stopped categories and chart privacy", async ({
  page,
}, info) => {
  await login(page);
  const categoryId = randomUUID();
  await command(page, "income", {
    type: "createCategory",
    id: categoryId,
    start: `${year}-01`,
    name: "Lương phản hồi",
    description: "Nguồn cố định",
  });
  if (month !== `${year}-01`)
    await command(page, "income", {
      type: "setMonthly",
      categoryId,
      month: `${year}-01`,
      amount: "0",
      note: "",
    });
  await page.reload();
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  const table = page.locator(".income-table");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const currentLabel = `Nhập Lương phản hồi · Tháng ${Number(month.slice(5))}/${year}`;
  await expect(
    table.getByRole("button", { name: currentLabel, exact: true }),
  ).toBeVisible();
  if (month !== `${year}-01`)
    await expect(
      table.getByRole("button", {
        name: `Nhập Lương phản hồi · Tháng 1/${year}`,
        exact: true,
      }),
    ).toHaveCount(0);
  await table
    .getByRole("button", { name: currentLabel, exact: true })
    .evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "center" }),
    );
  await table.getByRole("button", { name: currentLabel, exact: true }).click();
  const amount = page.getByLabel("Số tiền thực nhận (VND)");
  await amount.fill("000777");
  await amount.blur();
  await expect(amount).toHaveValue("777");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Báo cáo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const point = page.locator(`[data-tooltip-key="${month}"]`);
  await point.focus();
  await expect(page.getByRole("tooltip")).toContainText("777 ₫");
  await page.locator(".privacy-toggle").click();
  await point.focus();
  await expect(page.getByRole("tooltip")).not.toContainText("777");
  await page.locator(".privacy-toggle").click();
  await page
    .getByRole("button", { name: "Danh mục cố định", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sửa danh mục Lương phản hồi", exact: true })
    .click();
  const preview = page.getByRole("button", {
    name: "Xem trước thay đổi",
    exact: true,
  });
  await expect(preview).toBeDisabled();
  const name = page.getByRole("dialog").getByLabel("Tên", { exact: true });
  await name.fill("Tên khác");
  await expect(preview).toBeEnabled();
  await name.fill("Lương phản hồi");
  await expect(preview).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("button", { name: "Ngừng danh mục Lương phản hồi", exact: true })
    .click();
  await previewAndSave(page);
  await expect(page.locator(".income-item.is-inactive")).toContainText(
    "Đã ngừng",
  );
  await expect(
    page.getByRole("button", {
      name: "Ngừng danh mục Lương phản hồi",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/browser/feedback-income-${info.project.name}.png`,
    fullPage: true,
  });
});

test("expense closed selections, nested classification, brand backup, columns and empty years", async ({
  page,
}, info) => {
  await login(page, "/budgets");
  await command(page, "expenses", { type: "initialize", start: month });
  await page.reload();
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  await page.getByLabel("Tên hũ", { exact: true }).fill("Hũ phản hồi");
  await page
    .getByLabel("Mức mặc định mỗi tháng", { exact: true })
    .fill("000777");
  await page.getByLabel("Mức mặc định mỗi tháng", { exact: true }).blur();
  await expect(
    page.getByLabel("Mức mặc định mỗi tháng", { exact: true }),
  ).toHaveValue("777");
  await expect(page.locator("datalist")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Phương thức", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("button", { name: "Thêm phương thức / nhóm", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên", { exact: true })
    .fill("MoMo");
  await page.getByLabel("Thương hiệu", { exact: true }).selectOption("momo");
  await previewAndSave(page);
  await expect(page.getByLabel("Tên hũ", { exact: true })).toHaveValue(
    "Hũ phản hồi",
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Phương thức", exact: true }),
  ).toHaveValue("MoMo");
  await previewAndSave(page);
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(".expense-desktop-table .column-picker summary").click();
  await page
    .locator(".expense-desktop-table")
    .getByRole("checkbox", { name: "Hiện cột Mức tháng", exact: true })
    .uncheck();
  await expect(
    page
      .locator(".expense-desktop-table")
      .getByRole("columnheader", { name: "Mức tháng", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page
      .locator(".expense-desktop-table")
      .getByRole("columnheader", { name: "Mức tháng", exact: true }),
  ).toHaveCount(0);
  const backup = await (await page.request.get("/api/v1/data/backup")).json();
  expect(backup.tables.expense_labels[0]).toMatchObject({
    name: "MoMo",
    brand_key: "momo",
  });
  for (const brand of paymentBrands)
    expect((await page.request.get(`/brands/${brand.file}`)).ok()).toBe(true);
  const decoded = await page.evaluate(
    async (files) =>
      Promise.all(
        files.map(
          (file) =>
            new Promise<boolean>((resolve) => {
              const asset = new Image();
              asset.onload = () => resolve(asset.naturalWidth > 0);
              asset.onerror = () => resolve(false);
              asset.src = `/brands/${file}`;
            }),
        ),
      ),
    paymentBrands.map((brand) => brand.file),
  );
  expect(decoded.every(Boolean)).toBe(true);
  await page
    .getByRole("combobox", { name: "Năm", exact: true })
    .selectOption("2099");
  await expect(page.locator("main")).toContainText("Năm 2099 chưa có dữ liệu");
  await expect(
    page.getByRole("button", { name: "Thêm hũ", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/browser/feedback-expenses-${info.project.name}.png`,
    fullPage: true,
  });
});

test("unchanged drafts and field errors work consistently in savings and investments", async ({
  page,
}) => {
  await login(page, "/savings");
  for (const module of ["savings", "investments"] as const) {
    await command(page, module, {
      type: "createCategory",
      id: randomUUID(),
      start: module === "savings" ? month : today,
      kind: "cash",
      name: "Ví kiểm tra biểu mẫu",
      description: "",
      emoji: "🌱",
      ...(module === "savings" ? { unit: null } : {}),
    });
    await page.goto(`/${module}`);
    await page
      .getByRole("tab", {
        name: module === "savings" ? "Danh mục" : "Quản lý",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name:
          module === "savings"
            ? "Sửa danh mục Ví kiểm tra biểu mẫu"
            : "Sửa Ví kiểm tra biểu mẫu",
        exact: true,
      })
      .click();
    const preview = page.getByRole("button", {
      name: "Xem trước thay đổi",
      exact: true,
    });
    await expect(preview).toBeDisabled();
    const name = page.getByLabel("Tên danh mục", { exact: true });
    await name.fill("Ví đã thay đổi");
    await expect(preview).toBeEnabled();
    await name.fill("Ví kiểm tra biểu mẫu");
    await expect(preview).toBeDisabled();
    await page
      .getByRole("button", {
        name: module === "investments" ? "Đóng form" : "Hủy",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page
      .getByRole("button", { name: "Thêm danh mục", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Xem trước thay đổi", exact: true })
      .click();
    await expect(
      page.getByLabel("Tên danh mục", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await page
      .getByRole("button", {
        name: module === "investments" ? "Đóng form" : "Hủy",
        exact: true,
      })
      .click();
  }
});
