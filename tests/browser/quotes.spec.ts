import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { quotes, CATALOG_VERSION } from "../../src/features/quotes/catalog";
import { QUOTE_STORAGE_KEY } from "../../src/features/quotes/sequence";
import { visualThemeKeys } from "../../src/components/visual-theme";
import { completeTestEmailLogin } from "./helpers/test-email-login";

async function login(page: Page) {
  await page.goto("/login?next=/overview");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await expect(
    page.locator('.overview-widget-grid[data-ready="true"]'),
  ).toBeVisible();
  await quoteId(page);
}
async function quoteId(page: Page) {
  const card = page.locator("main .daily-note[data-quote-id]");
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  return (await card.getAttribute("data-quote-id"))!;
}
async function navigate(page: Page, path: string) {
  const menu = page.getByLabel("Menu chức năng", { exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(
      `.navigation a[href="${path}"]:visible, .mobile-nav a[href="${path}"]:visible`,
    )
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.locator("main h1")).toBeVisible();
  await expect(
    page.locator(`.navigation a[aria-current="page"]`).first(),
  ).toHaveAttribute("href", path);
}
async function sequence(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    QUOTE_STORAGE_KEY,
  );
}
async function saveWidgets(page: Page, widgets: string[]) {
  const previous = await (
    await page.request.get("/api/v1/overview/layout")
  ).json();
  const response = await page.request.put("/api/v1/overview/layout", {
    headers: { origin: process.env.TEST_BASE_URL! },
    data: {
      schemaVersion: 1,
      widgets,
      jarIds: [],
      expectedRevision: previous.revision,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test("every app route, SPA history and reload draw one fresh quote; public surfaces have only fixed illustrative copy", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  let remaining = (await sequence(page)).remaining.length;
  const seen = new Set([await quoteId(page)]);
  for (const path of [
    "/income",
    "/budgets",
    "/savings",
    "/investments",
    "/funds",
    "/goals",
    "/transactions",
    "/accounts",
    "/reports",
    "/settings",
  ]) {
    await navigate(page, path);
    const id = await quoteId(page);
    expect(seen.has(id)).toBe(false);
    seen.add(id);
    expect((await sequence(page)).remaining).toHaveLength(--remaining);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/reports$/);
  const back = await quoteId(page);
  expect(seen.has(back)).toBe(false);
  expect((await sequence(page)).remaining).toHaveLength(--remaining);
  await page.goForward();
  await expect(page).toHaveURL(/\/settings$/);
  const forward = await quoteId(page);
  expect(forward).not.toBe(back);
  expect((await sequence(page)).remaining).toHaveLength(--remaining);
  await page.reload();
  expect(await quoteId(page)).not.toBe(forward);
  expect((await sequence(page)).remaining).toHaveLength(--remaining);
  await page.waitForLoadState("networkidle");
  await page.goto("/profile");
  await quoteId(page);
  const beforePublic = JSON.stringify(await sequence(page));
  // A full document navigation must not abort WebKit's in-flight sidebar prefetches.
  await page.waitForLoadState("networkidle");
  await page.goto("/");
  await expect(page.locator(".daily-note")).toHaveCount(1);
  await expect(page.locator(".preview-quote .daily-note")).toHaveAttribute(
    "data-quote-id",
    "illustrative-quote",
  );
  const sample = await page.locator(".preview-quote blockquote").textContent();
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await expect(page.locator(".preview-quote blockquote")).toHaveText(sample!);
  expect(JSON.stringify(await sequence(page))).toBe(beforePublic);
  await page.reload();
  await expect(page.locator(".preview-quote blockquote")).toHaveText(sample!);
  await page.waitForLoadState("networkidle");
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.locator(".daily-note")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("language, theme, privacy, query, hash, dialogs and foreground refresh keep the current quote", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "/settings");
  const id = await quoteId(page);
  const before = JSON.stringify(await sequence(page));
  const quote = quotes.find((quote) => quote.id === id)!;
  await expect(page.locator(".daily-note-message")).toHaveText(quote.vi);
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(page.locator(".daily-note-message")).toHaveText(quote.en);
  await page.getByRole("radio", { name: "Tiếng Việt", exact: true }).check();
  await page
    .getByRole("radio", { name: "Đất lành — Nâu", exact: true })
    .check();
  await page.getByRole("radio", { name: "Tối", exact: true }).check();
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await page.evaluate(() => {
    history.pushState(null, "", "/settings?quote=unchanged#appearance");
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await quoteId(page)).toBe(id);
  expect(JSON.stringify(await sequence(page))).toBe(before);
  await navigate(page, "/overview");
  const overviewId = await quoteId(page);
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(await quoteId(page)).toBe(overviewId);
});

test("saved Overview layouts, preview and cancel preserve one quote and never write layout for placement", async ({
  page,
}) => {
  await login(page);
  await saveWidgets(page, ["income", "peace"]);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      request.url().endsWith("/overview/layout")
    )
      writes.push(request.url());
  });
  await page.reload();
  const id = await quoteId(page);
  await expect(
    page.locator('[data-widget="peace"] .daily-note'),
  ).toHaveAttribute("data-quote-id", id);
  await expect(
    page.locator('[data-widget="peace"] .daily-note-label'),
  ).toHaveCount(0);
  const before = JSON.stringify(await sequence(page));
  await page
    .getByRole("button", { name: "Tùy chỉnh Tổng quan", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[data-widget-option="peace"] input').uncheck();
  await dialog
    .getByRole("button", { name: "Xem thử bố cục", exact: true })
    .click();
  await expect(
    page.locator(".overview-workspace > .daily-note"),
  ).toHaveAttribute("data-quote-id", id);
  await page
    .locator(".overview-preview-note")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(await quoteId(page)).toBe(id);
  await expect(page.locator('[data-widget="peace"] .daily-note')).toBeVisible();
  expect(JSON.stringify(await sequence(page))).toBe(before);
  expect(writes).toEqual([]);
  await saveWidgets(page, []);
  await page.reload();
  await quoteId(page);
  await expect(page.locator("[data-widget]")).toHaveCount(0);
  await expect(page.locator(".overview-workspace > .daily-note")).toBeVisible();
});

test("slow or failing Overview layout never duplicates a quote; retry keeps the selected text", async ({
  page,
}) => {
  await login(page);
  await saveWidgets(page, ["peace"]);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/v1\/overview(?:\?.*)?$/, async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      json: { error: "Chưa tải được bố cục. Hãy thử lại." },
    });
  });
  try {
    await page.reload();
    await expect(
      page.getByText("Đang tải Tổng quan…", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".daily-note")).toHaveCount(0);
  } finally {
    release();
  }
  const id = await quoteId(page);
  await expect(page.locator(".overview-workspace > .daily-note")).toBeVisible();
  await page.unroute(/\/api\/v1\/overview(?:\?.*)?$/);
  await page.getByRole("button", { name: "Thử tải lại", exact: true }).click();
  await expect(
    page.locator('[data-widget="peace"] .daily-note'),
  ).toHaveAttribute("data-quote-id", id);
  expect(await quoteId(page)).toBe(id);
});

test("blocked session storage keeps the app usable and quotes still change on navigation", async ({
  page,
}) => {
  await login(page);
  await page.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage blocked for test");
      },
    }),
  );
  await page.reload();
  const first = await quoteId(page);
  await navigate(page, "/income");
  expect(await quoteId(page)).not.toBe(first);
  await page.reload();
  await quoteId(page);
});

test("quote typography, full text and contrast fit five themes, both languages and narrow or enlarged viewports", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await login(page);
  await navigate(page, "/settings");
  const longest = [...quotes].sort((a, b) => b.vi.length - a.vi.length)[0];
  await page.evaluate(
    ({ key, version, id, lastId }) =>
      sessionStorage.setItem(
        key,
        JSON.stringify({ version, lastId, remaining: [id] }),
      ),
    {
      key: QUOTE_STORAGE_KEY,
      version: CATALOG_VERSION,
      id: longest.id,
      lastId: quotes.find((quote) => quote.id !== longest.id)!.id,
    },
  );
  await page.reload();
  expect(await quoteId(page)).toBe(longest.id);
  // Load the real italic face with the complete catalog, including Vietnamese tone marks.
  const font = await page.locator("main .daily-note blockquote").evaluate(
    async (element, text) => {
      const family = getComputedStyle(element).fontFamily.split(",")[0];
      const loaded = await document.fonts.load(
        `italic 400 20px ${family}`,
        text,
      );
      return {
        family,
        faces: loaded.map((face) => ({
          status: face.status,
          style: face.style,
          family: face.family,
        })),
      };
    },
    quotes.map((quote) => `${quote.vi} ${quote.en}`).join(" "),
  );
  expect(font.family).toMatch(/Noto[_ ]Serif/i);
  expect(font.faces.length).toBeGreaterThanOrEqual(2);
  for (const face of font.faces) {
    expect(face.status).toBe("loaded");
    expect(face.style).toBe("italic");
    expect(face.family).toMatch(/Noto[_ ]Serif/i);
  }
  for (const locale of ["vi", "en"] as const) {
    await page
      .getByRole("radio", {
        name: locale === "vi" ? "Tiếng Việt" : "English",
        exact: true,
      })
      .check();
    for (const theme of visualThemeKeys)
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.visualTheme = theme;
            document.documentElement.dataset.theme = mode;
          },
          { theme, mode },
        );
        for (const width of [320, 375, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const card = page.locator("main .daily-note");
          await expect(card.locator("blockquote")).toHaveText(longest[locale]);
          const metrics = await card.evaluate((card) => {
            const block = card.querySelector("blockquote")!;
            const label = card.querySelector("figcaption")!;
            const style = getComputedStyle(block);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            const luminance = (color: string) => {
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, 1, 1);
              const rgb = [...ctx.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((channel) => {
                  const v = channel / 255;
                  return v <= 0.04045
                    ? v / 12.92
                    : ((v + 0.055) / 1.055) ** 2.4;
                });
              return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
            };
            const background = luminance(
              getComputedStyle(card).backgroundColor,
            );
            const contrast = (element: Element) => {
              const ink = luminance(getComputedStyle(element).color);
              return (
                (Math.max(ink, background) + 0.05) /
                (Math.min(ink, background) + 0.05)
              );
            };
            return {
              fit: document.documentElement.scrollWidth <= innerWidth,
              full:
                block.scrollHeight <= block.clientHeight + 1 &&
                block.scrollWidth <= block.clientWidth + 1,
              font: style.fontFamily,
              italic: style.fontStyle,
              size: parseFloat(style.fontSize),
              textContrast: contrast(block),
              labelContrast: contrast(label),
            };
          });
          expect(metrics.fit, `${theme}/${mode}/${width}`).toBe(true);
          expect(metrics.full).toBe(true);
          expect(metrics.font).toMatch(/Noto[_ ]Serif/i);
          expect(metrics.italic).toBe("italic");
          expect(metrics.size).toBeGreaterThanOrEqual(18);
          expect(metrics.textContrast).toBeGreaterThanOrEqual(4.5);
          expect(metrics.labelContrast).toBeGreaterThanOrEqual(4.5);
          if (
            theme === "forest" &&
            mode === "light" &&
            locale === "vi" &&
            [390, 768, 1440].includes(width)
          ) {
            await page.screenshot({
              path: info.outputPath(`quote-app-${width}.png`),
              fullPage: false,
            });
            await card.screenshot({
              path: info.outputPath(`quote-detail-${width}.png`),
            });
          }
        }
      }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });
  await expect(page.locator(".daily-note-mark")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await quoteId(page)).toBe(longest.id);
  await expect(page.locator(".daily-note")).not.toHaveAttribute("aria-live");
});
