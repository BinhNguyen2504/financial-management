import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { completeTestEmailLogin } from "./helpers/test-email-login";

async function signIn(page: Page) {
  await page.goto("/login?next=/overview");
  await page.locator(".public-language select").selectOption("vi");
  await completeTestEmailLogin(page, `${randomUUID()}@example.test`);
  await page.waitForURL((url) => url.pathname === "/overview");
  await page.goto("/");
  await expect(page.locator(".marketing-shell")).toHaveCount(0);
}

async function fits(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
}

test("public header stays on one row with reachable language and account actions", async ({
  page,
}) => {
  for (const member of [false, true]) {
    if (member) {
      await signIn(page);
      await page.goto("/profile");
      const name = "Nguyễn Văn Người Dùng Với Tên Rất Dài";
      await page.getByLabel("Họ và tên", { exact: false }).fill(name);
      await page
        .getByRole("button", { name: "Lưu thông tin", exact: true })
        .click();
      await expect(page.locator(".user-trigger")).toHaveAttribute(
        "aria-label",
        `Tài khoản của ${name}`,
      );
    }
    for (const route of ["/", "/login"]) {
      await page.goto(route);
      // Authenticated /login may redirect into the app; root tests member chrome.
      if (!page.url().endsWith(route)) continue;
      for (const width of [320, 390, 600, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const locale of ["vi", "en"]) {
          await page.locator(".public-language select").selectOption(locale);
          const boxes = await page
            .locator(".public-header")
            .evaluate((header) => {
              const bounds = (selector: string) =>
                header.querySelector(selector)!.getBoundingClientRect();
              const brand = bounds(".public-brand");
              const language = bounds(".public-language select");
              const account = bounds(".public-account .user-trigger");
              return {
                overlap:
                  Math.min(brand.bottom, language.bottom, account.bottom) -
                  Math.max(brand.top, language.top, account.top),
                gap: language.left - brand.right,
                sizes: [language, account].map((r) => ({
                  width: r.width,
                  height: r.height,
                })),
              };
            });
          expect(boxes.overlap).toBeGreaterThan(20);
          expect(boxes.gap).toBeGreaterThanOrEqual(0);
          for (const size of boxes.sizes) {
            expect(size.width).toBeGreaterThanOrEqual(44);
            expect(size.height).toBeGreaterThanOrEqual(44);
          }
          await fits(page);
        }
      }
    }
  }
});

test("phone preview scrolls fully, keeps controls available and never reads account data", async ({
  page,
}, info) => {
  const financial: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/")) financial.push(r.url());
  });
  await page.goto("/");
  const preview = page.locator(".product-preview");
  const workspace = preview.locator(".preview-workspace");
  for (const width of [320, 390, 600]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["vi", "en"]) {
      await page.locator(".public-language select").selectOption(locale);
      const tabs = preview.getByRole("tab");
      for (let index = 0; index < 6; index++) {
        await tabs.nth(index).click();
        await preview.evaluate((el) =>
          el.scrollIntoView({ block: "center", behavior: "instant" }),
        );
        await expect(workspace).toHaveJSProperty("scrollTop", 0);
        const geometry = await preview.evaluate((element) => {
          const scroller =
            element.querySelector<HTMLElement>(".preview-workspace")!;
          const box = element.getBoundingClientRect();
          return {
            width: box.width,
            height: box.height,
            client: scroller.clientWidth,
            scroll: scroller.scrollWidth,
            content: scroller.scrollHeight,
            visible: scroller.clientHeight,
          };
        });
        expect(geometry.width).toBeLessThanOrEqual(Math.min(360, width));
        expect(geometry.height).toBeLessThanOrEqual(721);
        expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
        expect(geometry.content).toBeGreaterThan(geometry.visible);
        await workspace.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        if (index === 0)
          await expect(
            preview.locator(".preview-overview-grid > p"),
          ).toBeInViewport();
        else await expect(preview.locator(".preview-chart")).toBeInViewport();
        await expect(preview.locator(".preview-privacy")).toBeInViewport();
        await expect(tabs.nth(index)).toBeInViewport();
      }
      await preview.locator(".preview-privacy").click();
      await expect(preview.getByRole("tabpanel")).toContainText("•••••• ₫");
      await tabs.nth(0).click();
      await expect(preview.getByRole("tabpanel")).toContainText("•••••• ₫");
      await preview.locator(".preview-privacy").click();
      await tabs.nth(0).focus();
      await page.keyboard.press("End");
      await expect(tabs.nth(5)).toBeFocused();
      await expect(tabs.nth(5)).toBeInViewport();
      await fits(page);
    }
  }
  await preview.screenshot({ path: info.outputPath("phone-preview.png") });
  expect(financial).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("fm-privacy")),
  ).toBeNull();
});

test("FAQ pushes following content through intermediate positions and supports interrupted toggles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const faq = page.locator(".faq-list");
  await expect(faq.locator("details[open]")).toHaveCount(0);
  await faq.locator("summary").first().scrollIntoViewIfNeeded();
  const samples = await faq.evaluate(async (list) => {
    const first = list.querySelector("summary")!;
    const next = list.querySelectorAll("details")[1];
    const positions = [next.getBoundingClientRect().top + scrollY];
    first.click();
    for (let i = 0; i < 25; i++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      positions.push(next.getBoundingClientRect().top + scrollY);
    }
    return positions;
  });
  expect(new Set(samples.map((n) => Math.round(n))).size).toBeGreaterThan(3);
  expect(samples.at(-1)!).toBeGreaterThan(samples[0] + 50);
  await faq.locator("summary").nth(1).click();
  await expect(faq.locator("details[open]")).toHaveCount(2);
  const first = faq.locator("details").first();
  await first.locator("summary").focus();
  await page.keyboard.press("Space");
  await expect(first).not.toHaveAttribute("open", "");
  await first.locator("summary").evaluate(async (element) => {
    const summary = element as HTMLElement;
    for (let i = 0; i < 3; i++) {
      summary.click();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  });
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("summary")).not.toHaveAttribute("aria-expanded");
  await first.locator("summary").press("Enter");
  await expect(first).not.toHaveAttribute("open", "");
  await expect(first.locator("[inert]")).toHaveCount(0);
  const content = await first.evaluate(async (details) => {
    const summary = details.querySelector("summary")!;
    summary.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const paragraph = document.createElement("p");
    paragraph.textContent = "More information. ".repeat(80);
    details.append(paragraph);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const natural = details.scrollHeight <= details.clientHeight + 1;
    paragraph.remove();
    summary.click();
    const protectedWhileClosing = Array.from(details.children)
      .filter((el) => el !== summary)
      .every((el) => (el as HTMLElement).inert);
    return { natural, protectedWhileClosing };
  });
  expect(content.natural).toBe(true);
  expect(content.protectedWhileClosing).toBe(true);
  await expect(first).not.toHaveAttribute("open", "");
});

test("reduced motion, changing content and member themes keep disclosures and previews usable", async ({
  page,
}) => {
  await signIn(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  for (const theme of ["forest", "water", "fire", "gold", "earth"]) {
    await page.evaluate((value) => {
      localStorage.setItem("fm-visual-theme", value);
      localStorage.setItem("fm-theme", "dark");
    }, theme);
    await page.reload();
    const faq = page.locator(".faq-list");
    await expect(page.locator("#faq-title")).toBeVisible();
    await faq.locator("summary").first().click();
    expect(
      await faq
        .locator("details")
        .first()
        .evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    await expect(faq.locator("details").first()).toHaveAttribute("open", "");
    const demo = page.locator(".product-preview");
    for (let index = 0; index < 6; index++) {
      await demo.getByRole("tab").nth(index).click();
      expect(
        await demo
          .locator(".preview-workspace")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    }
    await page.locator(".public-language select").selectOption("en");
    await expect(faq).not.toContainText("Một vài điều");
    await fits(page);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await fits(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await fits(page);
});

test("FAQ remains native and readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const first = page.locator(".faq-list details").first();
    await expect(first).not.toHaveAttribute("open", "");
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(first).toContainText("Thu nhập, Chi tiêu");
    await fits(page);
  } finally {
    await context.close();
  }
});
