import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Record actual browser scroll events, rather than only checking a CSS declaration.
async function recordScroll(container: Locator) {
  await container.evaluate((element) => {
    const state = {
      start: element.scrollTop,
      positions: [] as number[],
      last: performance.now(),
      started: performance.now(),
    };
    const source = element === document.scrollingElement ? document : element;
    const record = () => {
      state.positions.push(element.scrollTop);
      state.last = performance.now();
    };
    source.addEventListener("scroll", record);
    Object.assign(element, {
      scrollEvidence: state,
      stopRecording: () => source.removeEventListener("scroll", record),
    });
  });
}

async function expectScroll(container: Locator, reduced: boolean) {
  await expect
    .poll(() =>
      container.evaluate((element) => {
        const state = (
          element as HTMLElement & {
            scrollEvidence: { positions: number[]; last: number };
          }
        ).scrollEvidence;
        return (
          state.positions.length > 0 && performance.now() - state.last > 120
        );
      }),
    )
    .toBe(true);
  const evidence = await container.evaluate((element) => {
    const recorded = element as HTMLElement & {
      scrollEvidence: {
        start: number;
        positions: number[];
        last: number;
        started: number;
      };
      stopRecording(): void;
    };
    recorded.stopRecording();
    return { ...recorded.scrollEvidence, end: element.scrollTop };
  });
  expect(Math.abs(evidence.end - evidence.start)).toBeGreaterThan(100);
  if (reduced) expect(new Set(evidence.positions).size).toBeLessThanOrEqual(2);
  else {
    expect(new Set(evidence.positions).size).toBeGreaterThan(2);
    expect(Math.abs(evidence.positions[0] - evidence.start)).toBeLessThan(
      Math.abs(evidence.end - evidence.start),
    );
  }
  expect(evidence.last - evidence.started).toBeLessThan(2000);
  await test.info().attach("scroll-evidence", {
    body: JSON.stringify({ reduced, ...evidence }),
    contentType: "application/json",
  });
}

async function login(page: Page) {
  await page.goto("/login?next=/income");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/income$/);
  await expect(
    page.getByRole("button", { name: "Hướng dẫn", exact: true }),
  ).toBeEnabled();
}

for (const reduced of [false, true]) {
  const motion = reduced ? "reduce" : "no-preference";
  test(`landing anchors scroll down and back up with ${motion} motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("/");
    const root = page.locator("html");
    const links = page.locator('a.marketing-text-link[href="#trai-nghiem"]');
    await recordScroll(root);
    await links.first().click();
    await expectScroll(root, reduced);
    await expect(page.locator("#marketing-preview-title")).toBeInViewport();

    // Prepare the lower call to action without including setup in the evidence.
    await links
      .last()
      .evaluate((element) =>
        element.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    await recordScroll(root);
    await links.last().click();
    await expectScroll(root, reduced);
    await expect(page.locator("#marketing-preview-title")).toBeInViewport();

    const storyLink = page.locator('.public-nav a[href="/#cau-chuyen"]');
    if (await storyLink.isVisible()) {
      await recordScroll(root);
      await storyLink.click();
      await expectScroll(root, reduced);
      await expect(page.locator("#marketing-story-title")).toBeInViewport();
    }
  });

  test(`Help contents scroll inside the dialog with ${motion} motion and retain page position`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: motion });
    await login(page);
    const pageY = await page.evaluate(() => scrollY);
    const trigger = page.getByRole("button", {
      name: "Hướng dẫn",
      exact: true,
    });
    await trigger.click();
    const panel = page.locator("dialog.dialog-help");
    const body = panel.locator(".dialog-body");
    const destination = panel.locator('[data-help-id="pitfalls"]');
    await expect(panel.getByRole("navigation")).toBeVisible();
    await recordScroll(body);
    await panel
      .getByRole("button", { name: "Điểm dễ hiểu nhầm", exact: true })
      .click();
    await expectScroll(body, reduced);
    await expect(destination).toBeFocused();
    await expect(destination).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(pageY);
    await panel.screenshot({
      path: info.outputPath(`help-scroll-${motion}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(pageY);
  });
}
