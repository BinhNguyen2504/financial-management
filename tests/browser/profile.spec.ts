import { completeTestEmailLogin } from "./helpers/test-email-login";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page, address = `${randomUUID()}@example.test`) {
  await page.goto("/login?next=/profile");
  await completeTestEmailLogin(page, address);
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel("Họ và tên", { exact: true })).toBeVisible();
  return address;
}

test("profile persists across reload and another session; avatar menu owns logout", async ({
  page,
  browser,
}) => {
  const address = await login(page);
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Văn Bình");
  await page.getByLabel("Ngày sinh", { exact: true }).fill("1994-05-20");
  await page
    .getByRole("combobox", { name: "Giới tính", exact: true })
    .selectOption("male");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(address);
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu thông tin cá nhân.",
  );
  await page.reload();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Nguyễn Văn Bình",
  );
  await expect(page.getByLabel("Ngày sinh", { exact: true })).toHaveValue(
    "1994-05-20",
  );
  await expect(
    page.getByRole("combobox", { name: "Giới tính", exact: true }),
  ).toHaveValue("male");
  const context = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  try {
    const second = await context.newPage();
    await login(second, address);
    await expect(second.getByLabel("Họ và tên", { exact: true })).toHaveValue(
      "Nguyễn Văn Bình",
    );
  } finally {
    await context.close();
  }
  for (const route of ["/income", "/budgets", "/overview", "/settings"]) {
    await page.goto(route);
    const trigger = page.getByRole("button", {
      name: "Tài khoản của Nguyễn Văn Bình",
      exact: true,
    });
    await trigger.click();
    await expect(page.locator(".user-popover")).toContainText(address);
    await expect(
      page.getByRole("button", { name: "Đăng xuất", exact: true }),
    ).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
  await page
    .getByRole("button", { name: "Tài khoản của Nguyễn Văn Bình", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveCount(0);
});

test("validation and save failures preserve drafts and support retry", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("button", { name: "Lưu thông tin", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Ngày sinh", { exact: true }).fill("2000-01-01");
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.locator("#profile-name-error")).toContainText(
    "Vui lòng nhập",
  );
  await expect(page.locator("#profile-name")).toBeFocused();
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Tên sau khi thử lại");
  await page.getByLabel("Ngày sinh", { exact: true }).fill("2099-01-01");
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.locator("#profile-birth-error")).toBeVisible();
  await page.locator('[name="birth_date"]').fill("");
  await page.route("**/auth/v1/user", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 400, json: { message: "Local failure" } })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Nội dung đang nhập được giữ lại",
  );
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Tên sau khi thử lại",
  );
  await page.unroute("**/auth/v1/user");
  await page.route("**/auth/v1/user", (route) =>
    route.request().method() === "PUT"
      ? route.abort("failed")
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.locator('[data-toast-kind="warning"]')).toContainText(
    "Chưa xác nhận kết quả lưu hồ sơ",
  );
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Tên sau khi thử lại",
  );
  await page.unroute("**/auth/v1/user");
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu thông tin cá nhân.",
  );
});

test("remote logout failure still exits financial screens when Auth clears the local session", async ({
  page,
}) => {
  await login(page);
  const trigger = page.getByRole("button", {
    name: "Tài khoản của Bạn",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("link", { name: "Thông tin cá nhân", exact: true }),
  ).toBeFocused();
  await page.route("**/auth/v1/logout*", (route) =>
    route.fulfill({ status: 400, json: { message: "Local Auth failure" } }),
  );
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveCount(0);
});

test("period selects align without month navigation buttons and support all years", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/income");
  const period = page.locator(".income-workspace .month-year-field");
  const year = period.getByRole("combobox", { name: "Năm", exact: true });
  const month = period.getByRole("combobox", { name: "Tháng", exact: true });
  await expect(year).toBeVisible();
  await expect(period.getByRole("button")).toHaveCount(0);
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const controls = await period.locator("select").evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { bottom: r.bottom, height: r.height, width: r.width };
      }),
    );
    expect(controls).toHaveLength(2);
    expect(
      Math.abs(controls[0].bottom - controls[1].bottom),
    ).toBeLessThanOrEqual(1);
    expect(controls.every((r) => r.height >= 44 && r.width >= 44)).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await year.focus();
  await page.keyboard.press("Tab");
  await expect(month).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(year).toBeFocused();
  await year.selectOption("2000");
  await month.selectOption("1");
  await expect(year).toHaveValue("2000");
  await expect(month).toHaveValue("1");
  await year.selectOption("2099");
  await month.selectOption("12");
  await expect(year).toHaveValue("2099");
  await expect(month).toHaveValue("12");
  for (const [width, theme] of [
    [1440, "light"],
    [375, "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await period.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`period-${width}-${theme}.png`),
    });
  }
});
