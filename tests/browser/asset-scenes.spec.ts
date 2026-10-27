import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { visualThemeKeys } from "../../src/components/visual-theme";

test("asset illustrations differ across modules and themes in light, dark and compact layouts", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const finance: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/"))
      finance.push(request.url());
  });
  await page.goto("/");
  for (const name of ["Tiết kiệm", "Đầu tư"]) {
    await page
      .locator(".product-preview")
      .getByRole("tab", { name, exact: true })
      .click();
    await expect(page.locator(".product-preview .asset-scene")).toHaveCount(0);
  }
  expect(finance).toEqual([]);
  await page.goto("/login?next=/settings");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("radio", { name: "Khu vườn — Xanh lục", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const art = new Map<
    string,
    { svg: string; background: string; color: string }
  >();
  const shapes = new Set<string>();
  for (const kind of ["savings", "investments"] as const) {
    await page.goto(`/${kind}`);
    await page.waitForLoadState("networkidle");
    const heading = page.locator(
      kind === "savings"
        ? ".savings-workspace > .expense-page-heading"
        : ".investment-heading",
    );
    const scene = heading.locator(`.asset-scene[data-scene="${kind}"]`);
    await expect(scene).toBeVisible();
    await expect(scene).toHaveAttribute("aria-hidden", "true");
    await expect(scene).toHaveAttribute("focusable", "false");
    // Empty-state drawings must also differ from the page heading and from each other.
    const empty = page.locator(
      kind === "savings"
        ? ".expense-empty .garden-art"
        : ".investment-empty .garden-art",
    );
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute(
      "data-scene",
      kind === "savings" ? "jar" : "sprout",
    );
    for (const visual of visualThemeKeys) {
      for (const mode of ["light", "dark"] as const) {
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
        await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
        const selected = scene.locator(
          `:scope > [data-visual-only="${visual}"]`,
        );
        await expect(selected).toBeVisible();
        for (const other of visualThemeKeys.filter((key) => key !== visual))
          await expect(
            scene.locator(`:scope > [data-visual-only="${other}"]`),
          ).toBeHidden();
        const geometry = await selected.evaluate((node) => node.innerHTML);
        if (mode === "light") shapes.add(geometry);
        const bounds = await selected.evaluate((node) => {
          const box = (node as SVGGraphicsElement).getBBox();
          return {
            x: box.x,
            y: box.y,
            right: box.x + box.width,
            bottom: box.y + box.height,
          };
        });
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(360);
        expect(bounds.bottom).toBeLessThanOrEqual(240);
        expect(
          await scene.evaluate((node) =>
            [node, ...node.querySelectorAll("*")].every(
              (element) => getComputedStyle(element).animationName === "none",
            ),
          ),
        ).toBe(true);
        art.set(
          `${visual}-${mode}-${kind}`,
          await scene.evaluate((node, visual) => {
            const styles = getComputedStyle(node);
            const clone = node.cloneNode(true) as SVGSVGElement;
            clone.querySelectorAll("[data-visual-only]").forEach((group) => {
              if (group.getAttribute("data-visual-only") !== visual)
                group.remove();
            });
            for (const token of [
              "shadow",
              "sun",
              "leaf",
              "leaf-soft",
              "stem",
              "pot",
              "pot-rim",
            ])
              clone.style.setProperty(
                `--garden-${token}`,
                styles.getPropertyValue(`--garden-${token}`),
              );
            return {
              svg: clone.outerHTML,
              background: getComputedStyle(document.body).backgroundColor,
              color: styles.color,
            };
          }, visual),
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
      }
    }
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 740, height: 375 },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "125%";
      });
      await expect(scene).toBeVisible();
      const frame = await scene.boundingBox();
      expect(frame!.width).toBeGreaterThan(40);
      expect(frame!.x + frame!.width).toBeLessThanOrEqual(viewport.width);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await heading.screenshot({
      path: `artifacts/asset-scenes/${info.project.name}-${kind}-compact.png`,
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await page.setViewportSize(
      info.project.name === "mobile" || info.project.name === "webkit"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
    );
  }
  expect(shapes.size).toBe(10);
  finance.length = 0;
  await page.goto("/");
  await expect(page.locator('[data-landing-audience="member"]')).toBeVisible();
  for (const [kind, name] of [
    ["savings", "Tiết kiệm"],
    ["investments", "Đầu tư"],
  ] as const) {
    await page
      .locator(".product-preview")
      .getByRole("tab", { name, exact: true })
      .click();
    await expect(
      page.locator(`.preview-heading .asset-scene[data-scene="${kind}"]`),
    ).toBeVisible();
    await expect(
      page.locator(
        '.preview-heading .asset-scene > [data-visual-only="earth"]',
      ),
    ).toBeVisible();
  }
  expect(finance).toEqual([]);
  expect(errors).toEqual([]);
  if (info.project.name === "desktop") {
    const gallery = await context.newPage();
    await gallery.setViewportSize({ width: 900, height: 1400 });
    for (const mode of ["light", "dark"] as const) {
      const tiles = visualThemeKeys.flatMap((visual) =>
        ["savings", "investments"].map((kind) => {
          const image = art.get(`${visual}-${mode}-${kind}`)!;
          return `<article style="background:${image.background};color:${image.color}"><p>${visual} · ${kind}</p>${image.svg}</article>`;
        }),
      );
      await gallery.setContent(
        `<style>body{margin:0;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;background:${mode === "dark" ? "#191919" : "#eee"};font:15px system-ui}article{border-radius:16px;padding:12px 24px}p{margin:0}svg{display:block;width:100%;height:216px}</style>${tiles.join("")}`,
      );
      await gallery.screenshot({
        path: `artifacts/asset-scenes/gallery-${mode}.png`,
        fullPage: true,
      });
    }
    await gallery.close();
  }
});
