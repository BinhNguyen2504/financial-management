import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import postgres from "postgres";
import {
  buildFundReviewData,
  buildFundReviewSQL,
} from "../../scripts/lib/fund-review-data";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
} from "../../scripts/lib/investment-cloud-review.mjs";
import {
  buildReviewData,
  buildReviewSQL,
} from "../../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "../../scripts/lib/savings-review-data.mjs";
import { visualThemeKeys } from "../../src/components/visual-theme";
import { modules } from "../../src/features/catalog";

async function login(page: Page, seed = false) {
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.goto("/login?next=/settings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(
    page.getByRole("heading", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  if (seed) {
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
  }
}
async function chooseEnglish(page: Page) {
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(page.locator(".locale-scope")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
}
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
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

test("language preference and neutral logo cover every theme and display mode", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180000);
  const errors = watchErrors(page);
  await login(page);
  await page.getByRole("radio", { name: "Tiếng Việt", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "English", exact: true }),
  ).toBeChecked();
  const mark = page.locator(".sidebar .brand-icon");
  // Mobile sidebar is intentionally hidden; inspect computed identity, not its visibility.
  for (const language of ["en", "vi"] as const) {
    await page
      .getByRole("radio", {
        name: language === "en" ? "English" : "Tiếng Việt",
        exact: true,
      })
      .check();
    for (const theme of visualThemeKeys)
      for (const mode of ["light", "dark", "system"] as const) {
        await page.emulateMedia({ colorScheme: "dark" });
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
        const colour = await mark.evaluate((element) => ({
          bg: getComputedStyle(element).backgroundColor,
          fg: getComputedStyle(element).color,
        }));
        expect(colour).toEqual(
          mode === "light"
            ? { bg: "rgb(41, 39, 36)", fg: "rgb(247, 243, 235)" }
            : { bg: "rgb(247, 243, 235)", fg: "rgb(41, 39, 36)" },
        );
        await expect(
          page.locator('.visual-theme-picker input[type="radio"]'),
        ).toHaveCount(5);
        await fit(page);
      }
  }
  await chooseEnglish(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Language changed." }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveTitle("Settings · Financial Manager");
  await expect(page.locator(".locale-scope")).toHaveAttribute("lang", "en");
  const html = await (await context.request.get("/settings")).text();
  expect(html).toContain('lang="en"');
  expect(html).toContain("Display language");
  const second = await context.newPage();
  await second.goto("/settings");
  await second.getByRole("radio", { name: "Tiếng Việt", exact: true }).check();
  await expect(
    page.getByRole("heading", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await second.close();
  await chooseEnglish(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await fit(page);
  await mkdir("artifacts/localization", { recursive: true });
  await page.screenshot({
    path: `artifacts/localization/settings-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("English covers workspaces, Help and the public home while account names stay intact", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  const errors = watchErrors(page);
  await login(page, true);
  await chooseEnglish(page);
  const accountText = new Set<string>(["Bình Nguyễn", "Tiếng Việt"]);
  function names(value: unknown, key = "") {
    if (
      typeof value === "string" &&
      [
        "name",
        "description",
        "note",
        "method",
        "group",
        "unit",
        "counterparty",
        "reason",
      ].includes(key)
    )
      accountText.add(value);
    else if (Array.isArray(value)) value.forEach((item) => names(item));
    else if (value && typeof value === "object")
      Object.entries(value).forEach(([k, v]) => names(v, k));
  }
  for (const module of [
    "expenses",
    "income",
    "savings",
    "investments",
    "funds",
  ]) {
    const response = await page.request.get(`/api/v1/${module}`);
    expect(response.ok()).toBe(true);
    names(await response.json());
  }
  for (const route of [...modules.map((module) => module.slug), "profile"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const unknown = await page.evaluate(
      (allowed) => {
        const list: string[] = [];
        const walker = document.createTreeWalker(
          document.querySelector(".app-shell")!,
          NodeFilter.SHOW_TEXT,
        );
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const parent = node.parentElement;
          if (
            !parent ||
            !parent.getClientRects().length ||
            parent.closest("script, style")
          )
            continue;
          let text = node.textContent ?? "";
          for (const name of allowed)
            if (name) text = text.split(name).join("");
          if (/[ĂăÂâĐđÊêÔôƠơƯư\u0300-\u036f]/u.test(text.normalize("NFD")))
            list.push(text.trim());
        }
        return [...new Set(list)];
      },
      [...accountText].sort((a, b) => b.length - a.length),
    );
    expect(unknown, route).toEqual([]);
    await page.getByRole("button", { name: "Guide", exact: true }).click();
    const help = page.getByRole("dialog");
    await expect(help.locator(".help-section")).toHaveCount(6);
    expect(
      (await help.innerText()).replaceAll("Tiếng Việt", "").normalize("NFD"),
      route,
    ).not.toMatch(/[ĂăÂâĐđÊêÔôƠơƯư\u0300-\u036f]/u);
    await help.getByRole("button", { name: "Close", exact: true }).click();
    await expect(help).toHaveCount(0);
    await fit(page);
  }
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) requests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".public-nav")).toContainText("Explore");
  await expect(page.locator(".locale-scope")).toHaveAttribute("lang", "en");
  expect(requests).toEqual([]);
  const guest = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
  });
  try {
    await guest.addCookies([
      { name: "fm-locale", value: "en", url: process.env.TEST_BASE_URL! },
    ]);
    const loginPage = await guest.newPage();
    await loginPage.goto("/login");
    await expect(
      loginPage.getByRole("heading", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(loginPage.locator(".locale-scope")).toHaveAttribute(
      "lang",
      "en",
    );
  } finally {
    await guest.close();
  }
  expect(errors).toEqual([]);
});

test("cross-tab switches preserve a form, raw invalid money, filters and exact values", async ({
  page,
  context,
}) => {
  await login(page, true);
  await chooseEnglish(page);
  const settings = await context.newPage();
  await settings.goto("/settings");
  await page.goto("/income");
  await page
    .getByRole("button", { name: "Add one-off income", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Tiết kiệm — tên riêng");
  const amount = dialog.locator("#income-field-amount");
  await amount.fill("1,000,000");
  await expect(dialog.locator("#income-hint-amount")).toHaveText("1,000,000 ₫");
  await amount.fill("1.25");
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await settings
    .getByRole("radio", { name: "Tiếng Việt", exact: true })
    .check();
  await expect(
    dialog.getByRole("heading", { name: "Khoản thu phát sinh", exact: true }),
  ).toBeVisible();
  await expect(amount).toHaveValue("1.25");
  await expect(
    dialog.locator(".field-error").filter({ hasText: "English" }),
  ).toBeVisible();
  let previews = 0;
  await page.route("**/api/v1/income/commands", (route) => {
    previews++;
    return route.continue();
  });
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  expect(previews).toBe(0);
  // The invalid draft keeps English parsing until corrected, even though the surrounding UI is Vietnamese.
  await amount.fill("1,250,000");
  await expect(amount).not.toHaveAttribute("aria-invalid", "true");
  await expect(dialog.locator("#income-hint-amount")).toHaveText("1.250.000 ₫");
  await expect(dialog.getByLabel("Tên", { exact: true })).toHaveValue(
    "Tiết kiệm — tên riêng",
  );
  await settings.getByRole("radio", { name: "English", exact: true }).check();
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    "Tiết kiệm — tên riêng",
  );
  let command: unknown;
  await page.route("**/api/v1/income/commands", async (route) => {
    command = route.request().postDataJSON();
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(() => JSON.stringify(command))
    .toContain('"amount":"1250000"');
  await expect(dialog).toHaveCount(0);
  await page.goto("/budgets");
  await page
    .getByRole("button", { name: "Visible columns", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Show column Monthly plan", exact: true })
    .uncheck();
  await page.keyboard.press("Escape");
  const stored = await page.evaluate(() =>
    localStorage.getItem("fm-columns:expenses-workspace-2"),
  );
  await settings
    .getByRole("radio", { name: "Tiếng Việt", exact: true })
    .check();
  await expect(
    page.getByRole("heading", { name: "Chi tiêu", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cột hiển thị", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Hiện cột Mức tháng", exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("fm-columns:expenses-workspace-2"),
    ),
  ).toBe(stored);
  await settings.close();
});

test("English validation, network errors and uncertain writes retain drafts and retry identity", async ({
  page,
}) => {
  await login(page, true);
  await chooseEnglish(page);
  await page.goto("/income");
  await page
    .getByRole("button", { name: "Add one-off income", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Khoản thu riêng");
  await dialog.locator("#income-field-amount").fill("1250000");
  await page.route("**/api/v1/income/commands", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Số tiền phải lớn hơn 0.",
        code: "INVALID_INPUT",
        fieldErrors: { amount: "Số tiền phải lớn hơn 0." },
      }),
    }),
  );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.locator("#income-error-amount")).toHaveText(
    "Amount must be greater than 0.",
  );
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    "Khoản thu riêng",
  );
  await page.unroute("**/api/v1/income/commands");
  const ids: string[] = [];
  await page.route("**/api/v1/income/commands", async (route) => {
    ids.push(route.request().postDataJSON().id);
    if (ids.length === 1) {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toContainText("Save result unconfirmed.");
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    "Khoản thu riêng",
  );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});

test("blocked browser storage keeps language usable and English CSV has canonical data", async ({
  page,
  context,
}) => {
  await login(page, true);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked storage");
    };
    Storage.prototype.getItem = () => {
      throw new Error("blocked storage");
    };
  });
  await chooseEnglish(page);
  await page.getByRole("radio", { name: "Tiếng Việt", exact: true }).check();
  await chooseEnglish(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  for (const module of ["income", "savings", "investments"]) {
    const query =
      module === "income"
        ? "year=2026&from=1&to=10"
        : "from=2026-01-01&to=2026-10-22";
    const response = await context.request.get(
      `/api/v1/${module}/reports?${query}&format=csv&locale=en`,
    );
    expect(response.ok()).toBe(true);
    const csv = await response.text();
    expect(csv).toContain('"Type"');
    expect(csv).not.toContain('"Loại"');
    expect(csv).toMatch(/2026-/);
  }
  const icon = await page.request.get("/icons/icon.svg");
  expect(await icon.text()).toContain("#292724");
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.theme_color).toBe("#292724");
});

test.describe("offline language boundary", () => {
  test.use({ serviceWorkers: "allow" });
  test("offline keeps the selected app language and caches only the neutral document", async ({
    page,
    context,
    browserName,
  }, testInfo) => {
    await login(page);
    await chooseEnglish(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
    const cached = await page.evaluate(async () => {
      const names = await caches.keys();
      return Promise.all(
        names.map(async (name) => ({
          name,
          paths: (await (await caches.open(name)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        })),
      );
    });
    expect(cached).toEqual([
      { name: "fm-offline-v7", paths: ["/offline.html"] },
    ]);
    let offlinePage = page;
    try {
      if (browserName === "firefox") {
        // Playwright Firefox's global offline mode blocks navigation before a SW fetch event.
        // Execute the actual cached document at app/public URLs; do not claim a Firefox SW fallback.
        testInfo.annotations.push({
          type: "environment",
          description:
            "Firefox: cached offline document executed with navigation-response emulation; real SW network fallback covered in Chromium/WebKit.",
        });
        const body = await page.evaluate(async () => {
          const html = await (await caches.match("/offline.html"))!.text();
          for (const registration of await navigator.serviceWorker.getRegistrations())
            await registration.unregister();
          return html;
        });
        offlinePage = await context.newPage();
        await page.close();
        for (const path of ["income", "login"])
          await offlinePage.route(`**/${path}`, (route) =>
            route.fulfill({ contentType: "text/html; charset=utf-8", body }),
          );
      } else await context.setOffline(true);
      await offlinePage.goto("/income");
      await expect(offlinePage.locator("html")).toHaveAttribute("lang", "en");
      await expect(
        offlinePage.getByRole("heading", {
          name: "Pause for a moment.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(offlinePage.locator("body")).toContainText(
        "Offline transaction entry and synchronisation are not available.",
      );
      await offlinePage.goto("/login");
      await expect(offlinePage.locator("html")).toHaveAttribute("lang", "vi");
      await expect(
        offlinePage.getByRole("heading", {
          name: "Tạm dừng một nhịp.",
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});

test("English jar entry preserves an account name and submits exact grouped VND", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await login(page, true);
  await chooseEnglish(page);
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Add jar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Jar name", { exact: true }).fill("Tiết kiệm");
  await dialog
    .getByLabel("Holding method", { exact: true })
    .selectOption({ index: 1 });
  await dialog
    .getByLabel("Default monthly amount", { exact: true })
    .fill("1,000,000");
  let command: { action?: { name: string; amount: string } } | undefined;
  await page.route("**/api/v1/expenses/preview", async (route) => {
    command = route.request().postDataJSON();
    await route.continue();
  });
  await dialog
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await expect.poll(() => command?.action?.amount).toBe("1000000");
  expect(command?.action?.name).toBe("Tiết kiệm");
  await dialog
    .getByRole("button", { name: "Confirm save", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const view = await (await page.request.get("/api/v1/expenses")).json();
  expect(
    view.rows.some(
      (row: { name: string; target: string }) =>
        row.name === "Tiết kiệm" && row.target === "1000000",
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
