import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
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
import {
  visualThemeKeys,
  visualThemes,
  type VisualTheme,
} from "../../src/components/visual-theme";
// Default runs every identity; targeted additions may select the workspace matrix.
// Preference, contrast, thumbnail and system-mode checks still cover all themes.
const requestedMatrix =
  process.env.TEST_THEME_MATRIX?.split(",") ?? visualThemeKeys;
const matrixThemes = visualThemeKeys.filter((key) =>
  requestedMatrix.some((requested) => requested === key),
);
if (
  !matrixThemes.length ||
  requestedMatrix.some(
    (requested) => !visualThemeKeys.some((key) => key === requested),
  )
)
  throw new Error("TEST_THEME_MATRIX contains an unsupported theme");
const artifactDirectory =
  process.env.TEST_THEME_ARTIFACT_DIR ?? "artifacts/themes";

async function login(page: Page, seed = false) {
  await page.goto("/login?next=/settings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("123456");
  let ownerId = "";
  await page.route("**/auth/v1/verify", async (route) => {
    const response = await route.fetch();
    ownerId = (await response.json()).user.id;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("radio", { name: "Khu vườn — Xanh lục", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
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
async function appearance(
  page: Page,
  visual: VisualTheme,
  mode: "light" | "dark" | "system",
) {
  await page.evaluate(
    ({ visual, mode }) => {
      localStorage.setItem("fm-visual-theme", visual);
      localStorage.setItem("fm-theme", mode);
      window.dispatchEvent(new Event("fm-preference-change"));
    },
    { visual, mode },
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-visual-theme",
    visual,
  );
}
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("theme cards support keyboard, shared display mode, reload and cross-tab synchronization", async ({
  page,
  context,
}) => {
  await login(page);
  const forest = page.getByRole("radio", {
    name: "Khu vườn — Xanh lục",
    exact: true,
  });
  const water = page.getByRole("radio", {
    name: "Dòng nước — Xanh lam",
    exact: true,
  });
  await page.getByRole("radio", { name: "Tối", exact: true }).check();
  await forest.focus();
  await page.keyboard.press("ArrowRight");
  await expect(water).toBeChecked();
  await expect(water).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.locator('meta[name="theme-color"][content="#101D27"]'),
  ).not.toHaveAttribute("media");
  for (const key of visualThemeKeys) {
    const art = page.locator(`[data-visual-preview="${key}"]`);
    await expect(
      art.locator(`:scope > [data-visual-only="${key}"]`),
    ).toBeVisible();
    for (const hidden of visualThemeKeys.filter((theme) => theme !== key)) {
      await expect(
        art.locator(`:scope > [data-visual-only="${hidden}"]`),
      ).toBeHidden();
    }
  }
  const gold = page.getByRole("radio", {
    name: "Kim ngân — Vàng",
    exact: true,
  });
  await water.focus();
  await page.keyboard.press("ArrowRight");
  await expect(gold).toBeChecked();
  await expect(gold).toBeFocused();
  await expect(
    page.locator('meta[name="theme-color"][content="#241E13"]'),
  ).not.toHaveAttribute("media");
  const fire = page.getByRole("radio", { name: "Lửa ấm — Đỏ", exact: true });
  await gold.focus();
  await page.keyboard.press("ArrowRight");
  await expect(fire).toBeChecked();
  await expect(fire).toBeFocused();
  await expect(
    page.locator('meta[name="theme-color"][content="#291B1A"]'),
  ).not.toHaveAttribute("media");
  const earth = page.getByRole("radio", {
    name: "Đất lành — Nâu",
    exact: true,
  });
  await fire.focus();
  await page.keyboard.press("ArrowRight");
  await expect(earth).toBeChecked();
  await expect(earth).toBeFocused();
  await expect(
    page.locator('meta[name="theme-color"][content="#241F1A"]'),
  ).not.toHaveAttribute("media");
  await page.keyboard.press("Tab");
  // Native engines may enter a radio group at a different member. Verify that
  // Tab reaches the display group and Space selects the focused mode.
  const focusedMode = page.locator('input[name="theme"]:focus');
  await expect(focusedMode).toHaveCount(1);
  const entryMode = await focusedMode.inputValue();
  await page.keyboard.press("ArrowLeft");
  await expect(focusedMode).toHaveCount(1);
  await expect(focusedMode).not.toHaveValue(entryMode);
  const keyboardMode = await focusedMode.inputValue();
  await page.keyboard.press("Space");
  await expect(focusedMode).toBeChecked();
  if (keyboardMode === "system")
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  else
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      keyboardMode,
    );
  await page.reload();
  await expect(earth).toBeChecked();
  const other = await context.newPage();
  await other.goto("/settings");
  await other
    .getByRole("radio", { name: "Khu vườn — Xanh lục", exact: true })
    .check();
  await expect(forest).toBeChecked();
  await other
    .getByRole("radio", { name: "Theo hệ thống", exact: true })
    .check();
  await expect(
    page.getByRole("radio", { name: "Theo hệ thống", exact: true }),
  ).toBeChecked();
  await other.close();
});

for (const publicTheme of ["water", "gold", "fire", "earth"] as const)
  test(`signed-in landing preserves stored ${publicTheme} identity and previews never request account finances`, async ({
    page,
  }) => {
    await login(page);
    const errors: string[] = [],
      finance: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat|#418/i.test(m.text()))
        errors.push(m.text());
    });
    page.on("request", (r) => {
      if (
        /\/api\/v1\/(expenses|income|savings|investments|funds|backup)(\/|\?|$)/.test(
          r.url(),
        )
      )
        finance.push(r.url());
    });
    await page.addInitScript((publicTheme) => {
      localStorage.setItem("fm-visual-theme", publicTheme);
      localStorage.setItem("fm-theme", "dark");
      (window as unknown as { paints: string[] }).paints = [];
      const capture = () => {
        if (document.body && document.querySelector(".garden-art")) {
          (window as unknown as { paints: string[] }).paints.push(
            document.documentElement.dataset.visualTheme ?? "forest",
          );
        }
        if ((window as unknown as { paints: string[] }).paints.length < 20)
          requestAnimationFrame(capture);
      };
      requestAnimationFrame(capture);
    }, publicTheme);
    await page.goto("/");
    // The initial public HTML is marketing; wait for the existing session to resolve.
    await expect(
      page.locator('[data-landing-audience="member"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        `.story-art .garden-art > [data-visual-only="${publicTheme}"]`,
      ),
    ).toBeVisible();
    await expect(
      page.locator('.story-art .garden-art > [data-visual-only="forest"]'),
    ).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { paints: string[] }).paints.length,
        ),
      )
      .toBeGreaterThan(0);
    const paints = await page.evaluate(
      () => (window as unknown as { paints: string[] }).paints,
    );
    expect(paints.length).toBeGreaterThan(0);
    expect(paints.every((v) => v === publicTheme)).toBe(true);
    await page
      .locator(".product-preview")
      .getByRole("tab", { name: "Quỹ an toàn", exact: true })
      .click();
    await expect(
      page.locator(
        `.product-preview .fund-scene > [data-visual-only="${publicTheme}"]`,
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        '.product-preview .fund-scene > [data-visual-only="forest"]',
      ),
    ).toBeHidden();
    expect(finance).toEqual([]);
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute(
      "data-visual-theme",
      publicTheme,
    );
    expect(errors).toEqual([]);
  });

test("invalid preferences fall back and blocked storage still permits session changes", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem("fm-theme", "bad");
    localStorage.setItem("fm-visual-theme", "red");
  });
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Khu vườn — Xanh lục", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Theo hệ thống", exact: true }),
  ).toBeChecked();
  await page.evaluate(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith("fm-")) throw new DOMException("blocked");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("fm-")) throw new DOMException("blocked");
      set.call(this, key, value);
    };
  });
  await page
    .getByRole("radio", { name: "Đất lành — Nâu", exact: true })
    .check();
  await page.getByRole("radio", { name: "Tối", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-visual-theme",
    "earth",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const menu = page.locator(".mobile-menu summary");
  if (await menu.isVisible()) await menu.click();
  await page.locator('a[href="/overview"]:visible').first().click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-visual-theme",
    "earth",
  );
});

test("all identities follow system changes, honor explicit overrides, and adapt offline", async ({
  page,
}) => {
  await login(page);
  for (const visual of visualThemeKeys) {
    await appearance(page, visual, "system");
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      const hex = visualThemes[visual].browserColors[colorScheme];
      const expected = `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        expected,
      );
    }
  }
  await appearance(page, "earth", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(248, 244, 237)",
  );
  await page.goto("/offline.html");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(248, 244, 237)",
  );
  await expect(page.locator('p[data-visual-only="earth"]')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  await fit(page);
  await page.evaluate(() => {
    localStorage.setItem("fm-theme", "system");
    window.dispatchEvent(new StorageEvent("storage"));
  });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(36, 31, 26)",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#241F1A",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#F8F4ED",
  );
});

test("selected theme combinations fit all workspaces, help, charts and fund dialogs with synthetic data", async ({
  page,
}, info) => {
  test.setTimeout(360000);
  const viewport = page.viewportSize();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, true);
  for (const visual of matrixThemes)
    for (const mode of ["light", "dark"] as const) {
      // The settings screenshots below resize the viewport. Restore the device
      // before the next workspace pass so phone projects keep exercising phones.
      if (viewport) await page.setViewportSize(viewport);
      await appearance(page, visual, mode);
      for (const path of [
        "overview",
        "budgets",
        "income",
        "savings",
        "investments",
        "funds",
        "goals",
        "settings",
        "transactions",
        "accounts",
        "reports",
        "profile",
      ]) {
        await page.goto(`/${path}`);
        await expect(page.locator("main h1")).toBeVisible();
        // Let route prefetch finish before a synthetic full navigation aborts it in WebKit.
        await page.waitForLoadState("networkidle");
        await fit(page);
        for (const art of await page
          .locator(".garden-art, .fund-scene")
          .all()) {
          if (await art.isVisible()) {
            const forced = await art.getAttribute("data-visual-preview");
            await expect(
              art.locator(`:scope > [data-visual-only="${forced ?? visual}"]`),
            ).toBeVisible();
            for (const hidden of visualThemeKeys.filter(
              (key) => key !== (forced ?? visual),
            )) {
              await expect(
                art.locator(`:scope > [data-visual-only="${hidden}"]`),
              ).toBeHidden();
            }
          }
        }
        if (
          visual !== "forest" &&
          [
            "overview",
            "budgets",
            "income",
            "savings",
            "investments",
            "funds",
          ].includes(path)
        ) {
          await page.screenshot({
            path: `${artifactDirectory}/${info.project.name}-${visual}-${mode}-${path}.png`,
            fullPage: true,
          });
        }
      }
      await page.goto("/funds");
      await expect(page.locator(".fund-card")).toHaveCount(3);
      const ratios = await page
        .locator(".fund-card .fund-scene")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-progress")),
        );
      await page
        .getByRole("button", { name: "Ẩn số tiền", exact: true })
        .click();
      expect(
        await page
          .locator(".fund-card .fund-scene")
          .evaluateAll((nodes) =>
            nodes.map((n) => n.getAttribute("data-progress")),
          ),
      ).toEqual(ratios);
      await page
        .getByRole("button", { name: "Hiện số tiền", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Xem Emergency Fund", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").locator("p.eyebrow")).toContainText(
        visualThemes[visual].copy.emergency,
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Đóng", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Hướng dẫn", exact: true })
        .click();
      await expect(page.locator("dialog.dialog-help")).toBeVisible();
      await page
        .locator("dialog.dialog-help")
        .getByRole("button", { name: "Đóng", exact: true })
        .click();
      await page.goto("/settings");
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 2400 });
        await fit(page);
        await page.locator(".settings-appearance").screenshot({
          path: `${artifactDirectory}/${info.project.name}-${visual}-${mode}-${width}.png`,
        });
      }
    }
  expect(errors).toEqual([]);
});

test("theme updates preserve an open draft and reduced motion suppresses transitions", async ({
  page,
  context,
}) => {
  await login(page, true);
  const other = await context.newPage();
  await other.goto("/settings");
  await page.goto("/funds");
  await page
    .locator('[data-fund="emergency"]')
    .getByRole("button", { name: "Thêm tiền", exact: true })
    .click();
  const input = page.getByRole("dialog").getByLabel("Ghi chú", { exact: true });
  await input.fill("Bản nháp cần giữ");
  await other
    .getByRole("radio", { name: "Đất lành — Nâu", exact: true })
    .check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-visual-theme",
    "earth",
  );
  await expect(input).toHaveValue("Bản nháp cần giữ");
  await expect(page.getByRole("dialog")).toBeVisible();
  await other.emulateMedia({ reducedMotion: "reduce" });
  await other.getByRole("radio", { name: "Tối", exact: true }).check();
  await expect(other.locator(".visual-theme-card").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await other.close();
});

test("text and focus colors remain readable on all theme surfaces at narrow and enlarged layouts", async ({
  page,
}) => {
  await login(page);
  const semantics: Record<string, string[]> = {};
  for (const visual of visualThemeKeys)
    for (const mode of ["light", "dark"] as const) {
      await appearance(page, visual, mode);
      const checks = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const canvas = document.createElement("canvas"),
          ctx = canvas.getContext("2d")!;
        function luminance(token: string) {
          ctx.fillStyle = style.getPropertyValue(token).trim();
          ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data]
            .slice(0, 3)
            .map((c) => {
              const v = c / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        }
        function contrast(a: string, b: string) {
          const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
          return (hi + 0.05) / (lo + 0.05);
        }
        return {
          text: [
            "--canvas",
            "--surface",
            "--surface-alt",
            "--primary-soft",
          ].flatMap((bg) =>
            ["--text", "--muted"].map((fg) => ({
              fg,
              bg,
              ratio: contrast(fg, bg),
            })),
          ),
          semantics: [
            "--danger",
            "--danger-soft",
            "--warning",
            "--warning-soft",
          ].map((token) => style.getPropertyValue(token).trim()),
          button: contrast("--on-primary", "--primary"),
          focus: contrast("--primary", "--surface"),
        };
      });
      if (visual === "forest") semantics[mode] = checks.semantics;
      else expect(checks.semantics).toEqual(semantics[mode]);
      for (const check of checks.text)
        expect(
          check.ratio,
          `${visual}/${mode} ${check.fg} on ${check.bg}`,
        ).toBeGreaterThanOrEqual(4.5);
      expect(checks.button).toBeGreaterThanOrEqual(4.5);
      expect(checks.focus).toBeGreaterThanOrEqual(3);
      await page.setViewportSize({ width: 320, height: 800 });
      await fit(page);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => {
        document.documentElement.style.zoom = "2";
      });
      await fit(page);
      await expect(
        page.getByRole("radio", { name: "Đất lành — Nâu", exact: true }),
      ).toBeVisible();
      await page.evaluate(() => {
        document.documentElement.style.zoom = "";
      });
    }
});

test("service worker serves the selected earth theme offline and caches only the fallback", async ({
  browser,
  browserName,
  baseURL,
}) => {
  test.skip(
    browserName !== "chromium",
    "Service worker fallback is exercised in Chromium; offline document is covered in every engine.",
  );
  const context = await browser.newContext({
    baseURL,
    serviceWorkers: "allow",
    colorScheme: "dark",
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      localStorage.setItem("fm-visual-theme", "earth");
      localStorage.setItem("fm-theme", "dark");
    });
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
    const cache = await page.evaluate(async () => {
      const keys = await caches.keys();
      return {
        keys,
        paths: (
          await Promise.all(
            keys.map(async (key) =>
              (await (await caches.open(key)).keys()).map(
                (r) => new URL(r.url).pathname,
              ),
            ),
          )
        ).flat(),
      };
    });
    expect(cache.keys).toEqual(["fm-offline-v7"]);
    expect(cache.paths).toEqual(["/offline.html"]);
    await context.setOffline(true);
    await page.goto("/overview");
    await expect(
      page.getByRole("heading", { name: "Tạm dừng một nhịp." }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(36, 31, 26)",
    );
    await expect(page.locator('p[data-visual-only="earth"]')).toBeVisible();
  } finally {
    await context.close();
  }
});
