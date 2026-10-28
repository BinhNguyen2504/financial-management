import type { Locator, Page } from "@playwright/test";

/** Exercise both visible controls rather than writing the combined hidden value. */
export async function selectMonthYear(
  scope: Page | Locator,
  label: string,
  value: string,
) {
  const group = scope.getByRole("group", { name: label, exact: true });
  await group.locator("select").nth(0).selectOption(value.slice(0, 4));
  await group
    .locator("select")
    .nth(1)
    .selectOption(String(Number(value.slice(5, 7))));
}
