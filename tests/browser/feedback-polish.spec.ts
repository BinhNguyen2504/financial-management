import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page) {
  await page.goto("/login?next=/income");
  await expect(page.locator(".required-fields-note")).toHaveText("*Bắt buộc");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/income$/);
  await expect(
    page.getByRole("button", { name: "Thêm thu phát sinh", exact: true }),
  ).toBeVisible();
}

test("thin menu scrollbars retain keyboard access in expanded, collapsed and mobile menus", async ({
  page,
  browserName,
}, info) => {
  await login(page);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      theme,
    );
    await page.setViewportSize({ width: 1440, height: 480 });
    for (const collapsed of [false, true]) {
      await page.evaluate(
        (value) =>
          (document.documentElement.dataset.sidebar = value
            ? "collapsed"
            : "expanded"),
        collapsed,
      );
      const sidebar = page.locator(".sidebar");
      // macOS headless Firefox can force hidden overlay scrollbars (also in a
      // standalone fixture with only scrollbar-width: thin). Check scrolling too.
      await expect(sidebar).toHaveCSS(
        "scrollbar-width",
        browserName === "firefox" ? /^(thin|none)$/ : "thin",
      );
      await sidebar.locator("nav a").first().focus();
      for (let i = 1; i < (await sidebar.locator("nav a").count()); i++)
        await page.keyboard.press("Tab");
      await expect(sidebar.locator("nav a").last()).toBeFocused();
      await expect(sidebar.locator("nav a").last()).toBeInViewport({
        ratio: 1,
      });
      const metrics = await sidebar.evaluate((el: HTMLElement) => {
        const last = el
          .querySelector("nav a:last-child")!
          .getBoundingClientRect();
        return {
          top: el.scrollTop,
          gutter: el.offsetWidth - el.clientWidth,
          bottom: last.bottom,
        };
      });
      expect(metrics.top).toBeGreaterThan(0);
      expect(metrics.gutter).toBeLessThanOrEqual(12);
      expect(metrics.bottom).toBeLessThanOrEqual(480);
      await page.screenshot({
        path: info.outputPath(`menu-${theme}-${collapsed}.png`),
      });
    }
    await page.setViewportSize({ width: 375, height: 400 });
    await page.locator(".mobile-menu summary").click();
    const nav = page.locator(".mobile-menu .navigation");
    await nav.locator("a").last().focus();
    await expect(nav.locator("a").last()).toBeInViewport();
    expect(await nav.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({
      path: info.outputPath(`menu-mobile-${theme}.png`),
    });
    await page.locator(".mobile-menu summary").click();
  }
});

test("compact required legend is shared across every editor and translated", async ({
  page,
}, info) => {
  await login(page);
  for (const [path, action] of [
    ["budgets", "Chọn tháng bắt đầu"],
    ["income", "Thêm thu phát sinh"],
    ["savings", "Thêm danh mục"],
    ["investments", "Thêm danh mục"],
    ["funds", "Bắt đầu xây quỹ"],
  ]) {
    await page.goto(`/${path}`);
    await page.getByRole("button", { name: action, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".required-fields-note")).toHaveText(
      "*Bắt buộc",
    );
    await expect(dialog).not.toContainText("là thông tin cần nhập");
    await page.screenshot({ path: info.outputPath(`required-${path}.png`) });
    await page.keyboard.press("Escape");
  }
  await page.goto("/profile");
  await expect(page.locator(".required-fields-note")).toHaveText("*Bắt buộc");
  await page.goto("/settings");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await page.goto("/profile");
  await expect(page.locator(".required-fields-note")).toHaveText("*Required");
});

test("API errors, uncertain results and successful retries have distinct readable toasts", async ({
  page,
}, info) => {
  await login(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên", { exact: true }).fill("Bản nháp thông báo");
  await dialog.getByLabel("Số tiền thực nhận (VND)").fill("123000");
  const save = dialog.getByRole("button", { name: "Lưu", exact: true });
  await page.route("**/api/v1/income/commands", (route) =>
    route.fulfill({
      status: 400,
      json: {
        error:
          "Không thể lưu dữ liệu kiểm thử. Nội dung đang nhập được giữ lại để thử lại sau khi kiểm tra kết nối.",
        code: "INVALID_INPUT",
      },
    }),
  );
  await save.click();
  const toast = page.locator(".app-toast");
  await expect(toast).toHaveAttribute("data-toast-kind", "error");
  await expect(toast).toHaveCSS("opacity", "1");
  await expect(toast.locator(".app-toast-title")).toHaveText(
    "Chưa thể hoàn tất",
  );
  await expect(dialog.locator(".form-error-summary")).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(10000);
  await expect(toast).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      theme,
    );
    await page.screenshot({
      path: info.outputPath(`toast-error-${theme}.png`),
    });
    const bounds = await toast.boundingBox();
    const heading = await dialog
      .locator(".expense-dialog-heading")
      .boundingBox();
    const body = await dialog.locator(".dialog-body").boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(body!.y + 1);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    const close = toast.getByRole("button", { name: "Đóng thông báo" });
    expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  }
  await toast.getByRole("button").click();
  await page.unroute("**/api/v1/income/commands");
  await page.route("**/api/v1/income/commands", (route) => route.abort());
  await save.click();
  await expect(toast).toHaveAttribute("data-toast-kind", "warning");
  await expect(toast.locator(".app-toast-title")).toHaveText("Cần kiểm tra");
  await expect(dialog.getByLabel("Tên", { exact: true })).toHaveValue(
    "Bản nháp thông báo",
  );
  await page.screenshot({ path: info.outputPath("toast-warning.png") });
  await toast.getByRole("button").click();
  await page.unroute("**/api/v1/income/commands");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await save.click();
  await expect(dialog).toBeHidden();
  await expect(toast).toHaveAttribute("data-toast-kind", "success");
  await expect(toast.locator(".app-toast-title")).toHaveText("Thành công");
  await expect(toast).toHaveCSS("animation-name", "none");
  await toast.getByRole("button").focus();
  await toast.hover();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6000);
  await expect(toast).toBeVisible();
  await page.screenshot({ path: info.outputPath("toast-success.png") });
  await page
    .getByRole("button", { name: "Thêm thu phát sinh", exact: true })
    .focus();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6000);
  await expect(toast).toHaveCount(0);
});
