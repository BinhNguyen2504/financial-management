import { type Page, type Locator } from "@playwright/test";

export async function workspaceAction(
  page: Page,
  name: string,
): Promise<Locator> {
  const action = page.getByRole("button", { name, exact: true });
  if (!(await action.isVisible())) {
    const trigger = page.locator(".action-options-trigger");
    if (await trigger.isVisible()) await trigger.click();
  }
  return action;
}
