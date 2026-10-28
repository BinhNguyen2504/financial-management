import { test, expect, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { helpPages } from "../../src/features/help/registry";
import { vietnamClock } from "../../src/domain/expenses/engine";

async function login(page: Page, path = "/income") {
  await page.goto(`/login?next=${path}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.locator(".privacy-toggle")).toBeEnabled();
}
const help = (page: Page) => page.locator("dialog.dialog-help");
async function fit(panel: Locator) {
  expect(
    await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  expect(
    await panel
      .locator(".dialog-body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
}

test("all 12 pages provide the right help without finance requests, and contents support keyboard navigation", async ({
  page,
}) => {
  test.setTimeout(120000);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await login(page);
  for (const item of helpPages) {
    await page.goto(`/${item.id}`);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const requests: string[] = [];
    const record = (request: import("@playwright/test").Request) => {
      if (request.url().includes("/api/v1/")) requests.push(request.url());
    };
    page.on("request", record);
    const trigger = page.getByRole("button", {
      name: "Hướng dẫn",
      exact: true,
    });
    await expect(page.locator(".topbar .help-trigger")).toHaveCount(0);
    await expect(page.locator(".help-page-title .help-trigger")).toHaveCount(1);
    await trigger.click();
    await expect(help(page).getByRole("heading", { level: 2 })).toHaveText(
      `Hướng dẫn · ${item.title}`,
    );
    await expect(help(page).locator(".dialog-description")).toHaveText(
      item.status,
    );
    await expect(
      help(page).getByRole("navigation", { name: "Mục lục hướng dẫn" }),
    ).toBeVisible();
    await expect(help(page).locator(".help-section")).toHaveCount(6);
    await expect(help(page).locator(".help-section-number")).toHaveText([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
    ]);
    expect(await help(page).innerText()).not.toMatch(/\*\*|==/);
    await help(page)
      .getByRole("button", { name: "Ví dụ minh họa", exact: true })
      .click();
    await expect(help(page).locator('[data-help-id="examples"]')).toBeFocused();
    await expect(
      help(page).getByText(/Minh họa · Số liệu cố định/),
    ).toBeInViewport();
    await fit(help(page));
    // A TOC target is focusable but outside the tab order, after the last button.
    await page.keyboard.press("Tab");
    await expect(
      help(page).getByRole("button", { name: "Đóng", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      help(page).getByRole("button", {
        name: "Điểm dễ hiểu nhầm",
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      help(page).getByRole("button", { name: "Đóng", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(help(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
    page.off("request", record);
    expect(requests, item.id).toEqual([]);
  }
  expect(runtimeErrors).toEqual([]);
});

test("context help preserves two underlying dialogs, unsaved values, focus and scroll", async ({
  page,
}) => {
  await login(page, "/budgets");
  const init = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      id: randomUUID(),
      expectedVersion: 0,
      action: { type: "initialize", start: vietnamClock().today.slice(0, 7) },
    },
  });
  expect(init.ok(), await init.text()).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Thêm hũ", exact: true }).click();
  const parent = page.getByRole("dialog", {
    name: "Thêm hũ chi tiêu",
    exact: true,
  });
  await parent.getByLabel("Tên hũ", { exact: true }).fill("Hũ bản nháp Help");
  await parent
    .getByRole("button", { name: "Thêm phương thức / nhóm", exact: true })
    .click();
  const child = page.getByRole("dialog", {
    name: "Phương thức và nhóm",
    exact: true,
  });
  await child.getByLabel("Tên", { exact: true }).fill("Ví bản nháp Help");
  const trigger = child.getByRole("button", {
    name: "Giải thích: Phương thức và nhóm mục đích",
    exact: true,
  });
  await trigger.scrollIntoViewIfNeeded();
  const offset = await child
    .locator(".dialog-body")
    .evaluate((el) => el.scrollTop);
  const url = page.url();
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/v1/"))
      writes.push(request.url());
  });
  await trigger.click();
  await expect(
    help(page).locator('[data-help-id="classification"]'),
  ).toBeFocused();
  await expect(page.locator("dialog[open]")).toHaveCount(3);
  await expect(page.locator('dialog[open][aria-hidden="true"]')).toHaveCount(2);
  await help(page).getByRole("button", { name: "Đóng", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await help(page).evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(help(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(child.getByLabel("Tên", { exact: true })).toHaveValue(
    "Ví bản nháp Help",
  );
  expect(
    await child.locator(".dialog-body").evaluate((el) => el.scrollTop),
  ).toBe(offset);
  expect(await page.locator("body").evaluate((el) => el.style.overflow)).toBe(
    "hidden",
  );
  await child.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(parent.getByLabel("Tên hũ", { exact: true })).toHaveValue(
    "Hũ bản nháp Help",
  );
  await parent.getByRole("button", { name: "Đóng", exact: true }).click();
  expect(
    await page.locator("body").evaluate((el) => el.style.overflow),
  ).not.toBe("hidden");
  expect(page.url()).toBe(url);
  expect(writes).toEqual([]);
});

test("help remains available when finance fails, closes on back navigation and resets its section", async ({
  page,
}) => {
  await login(page, "/profile");
  // Use SPA navigation to preserve the app's shared layout.
  if (await page.locator(".sidebar").isVisible()) {
    await page.locator('.sidebar a[href="/income"]').click();
  } else {
    await page.locator(".mobile-menu summary").click();
    await page.locator('.mobile-menu a[href="/income"]').click();
  }
  await expect(page).toHaveURL(/\/income$/);
  await page
    .getByRole("button", { name: "Giải thích: Danh mục cố định là gì?" })
    .click();
  await expect(help(page).locator('[data-help-id="fixed"]')).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/profile/);
  await expect(help(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Hướng dẫn", exact: true }).click();
  await expect(help(page).getByRole("navigation")).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.route("**/api/v1/income?**", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: { code: "UNAVAILABLE", message: "Local test: unavailable" },
      },
    }),
  );
  await page.goto("/income");
  await page.getByRole("button", { name: "Hướng dẫn", exact: true }).click();
  await expect(help(page).locator('[data-help-id="fixed"]')).toContainText(
    "Danh mục cố định",
  );
});

test("help uses editorial emphasis and animates both ways while keeping the modal locked", async ({
  page,
}, info) => {
  await login(page, "/budgets");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const trigger = page.getByRole("button", { name: "Hướng dẫn", exact: true });
  // Slow only the entrance so we can inspect its actual intermediate geometry.
  const slow = await page.addStyleTag({
    content:
      ".dialog-help[open]:not([data-closing]) { animation-duration: 2s !important; }",
  });
  await trigger.click();
  await expect(help(page).getByRole("navigation")).toBeVisible();
  const entrance = await help(page).evaluate((element) => {
    const animation = element
      .getAnimations()
      .find((a) => (a as CSSAnimation).animationName === "help-slide-in")!;
    animation.pause();
    animation.currentTime = 0;
    const start = element.getBoundingClientRect().x;
    animation.currentTime = 1000;
    const middle = element.getBoundingClientRect().x;
    animation.finish();
    const end = element.getBoundingClientRect().x;
    return { start, middle, end };
  });
  expect(entrance.start).toBeGreaterThan(entrance.middle);
  expect(entrance.middle).toBeGreaterThan(entrance.end);
  await slow.evaluate((element) => element.parentNode?.removeChild(element));
  await expect(
    help(page).locator(".help-section-mindset .help-emphasis").first(),
  ).toHaveText("Chia trước, chi sau");
  await expect(
    help(page).locator(".help-section-examples .help-emphasis").first(),
  ).toHaveText("300.000 ₫");
  await expect(help(page).locator(".help-result strong").first()).toHaveText(
    "Kết quả:",
  );
  await help(page)
    .getByRole("button", { name: "Tư duy sử dụng", exact: true })
    .click();
  await page.screenshot({
    path: `artifacts/help-refinement/mindset-${info.project.name}.png`,
  });
  await help(page)
    .getByRole("button", { name: "Ví dụ minh họa", exact: true })
    .click();
  await page.screenshot({
    path: `artifacts/help-refinement/examples-${info.project.name}.png`,
  });
  const exit = await help(page).evaluate(async (element) => {
    (
      element.querySelector('button[aria-label="Đóng"]') as HTMLButtonElement
    ).click();
    await new Promise(requestAnimationFrame);
    const animation = element
      .getAnimations()
      .find((a) => (a as CSSAnimation).animationName === "help-slide-out")!;
    animation.pause();
    animation.currentTime = 110;
    const result = {
      open: (element as HTMLDialogElement).open,
      locked: document.body.style.overflow,
      containsFocus: element.contains(document.activeElement),
      x: element.getBoundingClientRect().x,
    };
    animation.finish();
    return result;
  });
  expect(exit.open).toBe(true);
  expect(exit.locked).toBe("hidden");
  expect(exit.containsFocus).toBe(true);
  expect(exit.x).toBeGreaterThan(entrance.end);
  await expect(help(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // A missing animationend must not leave the page locked.
  await page.addStyleTag({
    content: ".dialog-help[open][data-closing] { animation: none !important; }",
  });
  await trigger.click();
  await expect(help(page).getByRole("navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();
  expect(
    await help(page).evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.keyboard.press("Escape");
  await expect(help(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("drawer fits desktop, narrow phone, landscape and large text in both themes", async ({
  page,
}, info) => {
  await login(page, "/budgets");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 375, 812]) {
    await page.setViewportSize({ width, height: width === 812 ? 375 : 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      const trigger = page.getByRole("button", {
        name: "Hướng dẫn",
        exact: true,
      });
      await trigger.click();
      await expect(help(page).getByRole("navigation")).toBeVisible();
      await fit(help(page));
      const rect = await help(page).boundingBox();
      const expectedWidth = width < 960 ? Math.min(640, width - 32) : 640;
      expect(Math.round(rect!.width)).toBe(expectedWidth);
      expect(Math.round(rect!.x)).toBe(
        width < 960 ? (width - expectedWidth) / 2 : width - 640,
      );
      if (width < 960) {
        expect(rect!.y).toBeGreaterThanOrEqual(16);
        expect(rect!.height).toBeLessThanOrEqual(
          page.viewportSize()!.height * 0.9 + 1,
        );
      }
      await expect(
        help(page).getByRole("button", { name: "Đóng", exact: true }),
      ).toBeInViewport();
      if (info.project.name === "desktop" && width !== 812) {
        await page.screenshot({ path: `artifacts/help/${width}-${theme}.png` });
      }
      await help(page)
        .locator(".help-content")
        .evaluate((el) => (el.style.fontSize = "32px"));
      await fit(help(page));
      await help(page)
        .getByRole("button", { name: "Điểm dễ hiểu nhầm", exact: true })
        .click();
      await expect(
        help(page).locator('[data-help-id="pitfalls"]'),
      ).toBeFocused();
      await expect(
        help(page).getByRole("button", { name: "Đóng", exact: true }),
      ).toBeInViewport();
      if (width === 1440) await page.mouse.click(20, 200);
      else
        await help(page)
          .getByRole("button", { name: "Đóng", exact: true })
          .click();
      await expect(help(page)).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  }
});

test("failed lazy content load is recoverable and does not hold a form hostage", async ({
  page,
}) => {
  await login(page);
  await page.waitForLoadState("networkidle");
  let blocked = 0;
  await page.route(/\/_next\/static\/chunks\/.*\.js/, (route) => {
    blocked++;
    return route.abort();
  });
  await page.getByRole("button", { name: "Hướng dẫn", exact: true }).click();
  await expect(
    help(page).getByRole("button", { name: "Thử lại hướng dẫn" }),
  ).toBeVisible();
  expect(blocked).toBeGreaterThan(0);
  await page.unroute(/\/_next\/static\/chunks\/.*\.js/);
  await help(page).getByRole("button", { name: "Thử lại hướng dẫn" }).click();
  await expect(
    help(page).getByRole("navigation", { name: "Mục lục hướng dẫn" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Hướng dẫn", exact: true }),
  ).toBeFocused();
});

test("public preview explains each tab using fixed content and no financial calls", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) calls.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".help-trigger")).toHaveCount(0);
  for (const title of [
    "Chi tiêu",
    "Thu nhập",
    "Tiết kiệm",
    "Đầu tư",
    "Quỹ an toàn",
  ]) {
    await page.getByRole("tab", { name: title, exact: true }).click();
    await page.locator(".preview-help summary").click();
    await expect(page.locator(".preview-help")).toContainText(
      `Hướng dẫn · ${title}`,
    );
    await expect(page.locator(".preview-help small")).toBeVisible();
  }
  expect(calls).toEqual([]);
});
