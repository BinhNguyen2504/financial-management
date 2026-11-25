import type { Locator, Page } from "@playwright/test";

/**
 * Opens the select-like multi-value filter named `legend` and returns its option group.
 * The group only exists while the panel is open; call `closeMultiFilter` before using controls
 * that the panel may cover.
 */
export async function openMultiFilter(
  page: Page,
  legend: string,
): Promise<Locator> {
  const name = new RegExp(`^${legend}`);
  const trigger = page.getByRole("button", { name });
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  return page.getByRole("group", { name });
}
export async function closeMultiFilter(page: Page) {
  await page.keyboard.press("Escape");
}
