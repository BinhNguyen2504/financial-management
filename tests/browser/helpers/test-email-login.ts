import { expect, type Page } from "@playwright/test";

const authOrigins = new Map<string, string>();

/** General multi-session fixtures do not test resend throttling. Only the local
 * Auth double is advanced here; auth-otp.spec.ts tests the actual cooldown. */
export async function completeTestEmailLogin(page: Page, email: string) {
  const app = new URL(page.url());
  if (
    !["127.0.0.1", "localhost"].includes(app.hostname) ||
    !email.endsWith("@example.test")
  )
    throw new Error(
      "Test email login requires the isolated local Auth double.",
    );
  const auth = authOrigins.get(app.origin);
  if (auth) {
    const reset = await page.request.post(`${auth}/__test__/otp-state`, {
      data: { email, allowResend: true },
    });
    expect([200, 404]).toContain(reset.status());
  }
  await page.getByLabel("Email", { exact: true }).fill(email);
  const response = page.waitForResponse(
    (value) =>
      new URL(value.url()).pathname === "/auth/v1/otp" &&
      value.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  const result = await response;
  expect(result.ok(), await result.text()).toBe(true);
  authOrigins.set(app.origin, new URL(result.url()).origin);
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
}
