import type { Page } from "@playwright/test";

/**
 * Narrow screens keep filters behind a "Bộ lọc" button. Opens every collapsed
 * one that is showing; does nothing where the filters are already visible.
 * Call it after the page content has rendered and after changing the viewport.
 */
export async function openFilters(page: Page) {
  const triggers = page.locator(".filter-options-trigger:visible");
  for (const trigger of await triggers.all())
    if ((await trigger.getAttribute("aria-expanded")) === "false")
      await trigger.click();
}
