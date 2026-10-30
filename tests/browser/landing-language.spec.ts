import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const picker = (page: Page) => page.getByRole("combobox", { name: /Language/ });
const tabs = [
  "Income",
  "Expenses",
  "Savings",
  "Investments",
  "Safety funds",
  "Goals",
];

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|react error|minified react/i.test(message.text())
    )
      errors.push(message.text());
  });
  return errors;
}
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  for (const target of [
    picker(page),
    page.locator(".public-account .user-trigger"),
  ]) {
    const rect = await target.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
    expect(rect!.height).toBeGreaterThanOrEqual(40);
  }
}
async function noVietnameseCopy(page: Page) {
  // Include expanded FAQ, selected preview and accessible labels, but allow proper names.
  await page
    .locator("main details")
    .evaluateAll((elements) =>
      elements.forEach((el) => el.setAttribute("open", "")),
    );
  const untranslated = await page.evaluate(() => {
    const found: string[] = [];
    const strip = (s: string) =>
      s.replaceAll("Bình Nguyễn", "").replaceAll("Tiếng Việt", "");
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || element.closest("script,style,noscript,option")) continue;
      if (
        !element.getClientRects().length ||
        getComputedStyle(element).visibility === "hidden"
      )
        continue;
      if (
        /[ĂăÂâĐđÊêÔôƠơƯư\u0300-\u036f]/u.test(
          strip(node.textContent ?? "").normalize("NFD"),
        )
      )
        found.push(node.textContent!.trim());
    }
    for (const el of document.querySelectorAll("[aria-label], [title]")) {
      if (!el.getClientRects().length) continue;
      for (const attribute of ["aria-label", "title"])
        if (
          /[ĂăÂâĐđÊêÔôƠơƯư\u0300-\u036f]/u.test(
            strip(el.getAttribute(attribute) ?? "").normalize("NFD"),
          )
        )
          found.push(el.getAttribute(attribute)!);
    }
    return [...new Set(found)];
  });
  expect(untranslated).toEqual([]);
}
async function login(page: Page) {
  await page.goto("/login?next=/settings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  // Finish Settings' initial read before a full navigation disposes its document.
  // WebKit can surface that interrupted fetch as a pageerror even when it is caught.
  const statusResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/v1/data/status",
  );
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/settings$/);
  const response = await statusResponse;
  expect(response.ok()).toBe(true);
  await response.finished();
  await expect(
    page.getByText("Đang kiểm tra trạng thái dữ liệu…", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".settings-feedback-error")).toHaveCount(0);
}

test("guest header translates the full landing and preserves interactive preview state", async ({
  page,
}, testInfo) => {
  const errors = watchErrors(page);
  const financial: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) financial.push(request.url());
  });
  await page.goto("/");
  const preview = page.locator(".product-preview");
  await preview.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await preview.getByRole("button", { name: "Ẩn số tiền minh họa" }).click();
  await picker(page).selectOption("en");
  const confirmation = page.locator(".app-toast");
  await expect(confirmation).toContainText("Language changed.");
  const pickerBounds = await picker(page).boundingBox();
  const toastBounds = await confirmation.boundingBox();
  expect(toastBounds!.y).toBeGreaterThan(
    pickerBounds!.y + pickerBounds!.height,
  );
  await confirmation.getByRole("button").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(
    "Personal finance management | Financial Manager",
  );
  await expect(page.locator("h1")).toContainText("Take charge of your money.");
  await expect(
    preview.getByRole("tab", { name: "Income", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(preview.getByRole("tabpanel")).toContainText("•••••• ₫");
  await preview
    .getByRole("button", { name: "Show illustrative amounts" })
    .click();
  await expect(preview.getByRole("tabpanel")).toContainText("28,500,000 ₫");
  for (const name of tabs) {
    await preview.getByRole("tab", { name, exact: true }).click();
    await noVietnameseCopy(page);
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await fit(page);
    await page.evaluate(() =>
      scrollTo({ top: 0, left: 0, behavior: "instant" }),
    );
    await page.screenshot({
      path: testInfo.outputPath(`guest-en-${width}.png`),
    });
  }
  await page.getByRole("link", { name: "Sign in", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(picker(page)).toBeFocused();
  expect(
    await picker(page).evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  await page.reload();
  await expect(picker(page)).toHaveValue("en");
  await expect(page.locator("h1")).toContainText("Take charge of your money.");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".locale-scope")).toHaveCount(1);
  await page.getByLabel("Email", { exact: true }).fill("draft@example.test");
  await picker(page).selectOption("vi");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "draft@example.test",
  );
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  expect(financial).toEqual([]);
  expect(errors).toEqual([]);
});

test("English cookie renders home and public chrome without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
    javaScriptEnabled: false,
  });
  try {
    await context.addCookies([
      { name: "fm-locale", value: "en", url: process.env.TEST_BASE_URL! },
    ]);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText(
      "Take charge of your money.",
    );
    await expect(page).toHaveTitle(
      "Personal finance management | Financial Manager",
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "en_GB",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /^Manage your personal finances/,
    );
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".public-footer")).toContainText(
      "Manage your finances on the web and mobile.",
    );
  } finally {
    await context.close();
  }
});

test("member home shares language with Settings and another tab across all themes", async ({
  page,
  context,
}, testInfo) => {
  const errors = watchErrors(page);
  await login(page);
  await page.goto("/");
  await picker(page).selectOption("en");
  await expect(page.locator("h1")).toContainText("A clearer place");
  const preview = page.locator(".product-preview");
  for (const theme of ["forest", "water", "fire", "gold", "earth"]) {
    await page.evaluate(
      (value) => localStorage.setItem("fm-visual-theme", value),
      theme,
    );
    await page.reload();
    for (const name of tabs) {
      await preview.getByRole("tab", { name, exact: true }).click();
      await noVietnameseCopy(page);
    }
    await fit(page);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await fit(page);
  await page.screenshot({ path: testInfo.outputPath("member-en-320.png") });
  await page.locator(".public-account .user-trigger").click();
  await expect(
    page.getByRole("link", { name: "Personal details", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/settings");
  await expect(
    page.getByRole("radio", { name: "English", exact: true }),
  ).toBeChecked();
  const second = await context.newPage();
  try {
    await second.goto("/");
    await picker(second).selectOption("vi");
    await expect(
      page.getByRole("radio", { name: "Tiếng Việt", exact: true }),
    ).toBeChecked();
    await page.getByRole("radio", { name: "English", exact: true }).check();
    await expect(picker(second)).toHaveValue("en");
    await expect(second.locator("h1")).toContainText("A clearer place");
  } finally {
    await second.close();
  }
  expect(errors).toEqual([]);
});

test("blocked localStorage preserves the public language through cookie and navigation", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await picker(page).selectOption("en");
  await expect(page.locator("h1")).toContainText("Take charge of your money.");
  await page.reload();
  await expect(picker(page)).toHaveValue("en");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await picker(page).selectOption("vi");
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});

test("both blocked persistence mechanisms keep the selected language for the public session", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await picker(page).selectOption("en");
  await expect(page.locator("h1")).toContainText("Take charge of your money.");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await picker(page).selectOption("vi");
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
