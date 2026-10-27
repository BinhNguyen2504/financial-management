import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function requestCode(page: Page, english = false) {
  if (english) {
    await page.context().addCookies([
      {
        name: "fm-locale",
        value: "en",
        url: process.env.TEST_BASE_URL!,
      },
    ]);
  }
  await page.goto("/login?next=/profile");
  const email = `${randomUUID()}@example.test`;
  await page.getByLabel("Email", { exact: true }).fill(email);
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/auth/v1/otp",
  );
  await page
    .getByRole("button", {
      name: english ? "Send sign-in code" : "Gửi mã đăng nhập",
      exact: true,
    })
    .click();
  const authURL = new URL((await response).url()).origin;
  const input = page.getByLabel(english ? "Confirmation code" : "Mã xác nhận", {
    exact: true,
  });
  await expect(input).toBeFocused();
  return { email, authURL, input };
}

test("OTP validates six digits, supports paste/autofill and preserves leading zero", async ({
  page,
  context,
}) => {
  const { email, authURL, input } = await requestCode(page);
  await expect(page.locator("#login-token-hint")).toContainText(email);
  await expect(page.locator("#login-token-hint")).toContainText("30 phút");
  await expect(input).toHaveAttribute("autocomplete", "one-time-code");
  await expect(input).toHaveAttribute("inputmode", "numeric");
  let verifies = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/auth/v1/verify") verifies++;
  });
  for (const code of ["", "123", "abc123"]) {
    await input.fill(code);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.locator("#login-error-token")).toContainText(
      "Nhập đủ 6 chữ số",
    );
    await expect(input).toBeFocused();
  }
  expect(verifies).toBe(0);
  await page.request.post(`${authURL}/__test__/otp-state`, {
    data: { email, token: "012345" },
  });
  // A paste event must not be cancelled; fill models the resulting editable value
  // without depending on OS clipboard permissions in mobile/WebKit emulation.
  expect(
    await input.evaluate((element) =>
      element.dispatchEvent(
        new Event("paste", { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(true);
  await input.fill("012345");
  await expect(input).toHaveValue("012345");
  expect(verifies).toBe(0);
  const verification = page.waitForRequest(
    (r) => new URL(r.url()).pathname === "/auth/v1/verify",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await verification).postDataJSON()).toMatchObject({
    email,
    token: "012345",
    type: "email",
  });
  await expect(page).toHaveURL(/\/profile$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Thông tin cá nhân", exact: true }),
  ).toBeVisible();
  // A code cannot open a second browser session after it has been consumed.
  const replay = await context.request.post(`${authURL}/auth/v1/verify`, {
    data: { email, token: "012345", type: "email" },
  });
  expect(replay.status()).toBe(403);
});

test("OTP resend cooldown survives changing email and resends without leaving the code step", async ({
  page,
}) => {
  const { email, authURL, input } = await requestCode(page);
  const resend = page.getByRole("button", { name: /^Gửi lại sau/ });
  await expect(resend).toBeDisabled();
  const limited = await page.request.post(`${authURL}/auth/v1/otp`, {
    data: { email },
  });
  expect(limited.status()).toBe(429);
  await page.getByRole("button", { name: "Đổi email", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(
    page.getByRole("button", { name: /^Gửi lại sau/ }),
  ).toBeDisabled();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await expect(
    page.getByRole("button", { name: "Gửi mã đăng nhập", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await expect(
    page.getByRole("button", { name: /^Gửi lại sau/ }),
  ).toBeDisabled();
  // Change Date only: keep native timers/SDK locks running during navigation
  // and context teardown, while the UI's interval observes the new deadline.
  await page.clock.setFixedTime(Date.now() + 61_000);
  await page.request.post(`${authURL}/__test__/otp-state`, {
    data: { email, allowResend: true, expired: true },
  });
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await input.fill("123");
  await page.clock.setFixedTime(Date.now() + 122_000);
  await page.request.post(`${authURL}/__test__/otp-state`, {
    data: { email, allowResend: true },
  });
  await page.getByRole("button", { name: "Gửi lại mã", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(resend).toBeDisabled();
  // Verify the replacement challenge through the local Auth contract. Browser
  // login/navigation is covered with a real clock in the leading-zero case.
  const verification = await page.request.post(`${authURL}/auth/v1/verify`, {
    data: { email, token: "123456", type: "email" },
  });
  expect(verification.status()).toBe(200);
  expect((await verification.json()).user.email).toBe(email);
});

test("OTP rejects wrong, expired and used codes while retaining email", async ({
  page,
}) => {
  const { email, authURL, input } = await requestCode(page);
  const state = await page.request.post(`${authURL}/__test__/otp-state`, {
    data: { email },
  });
  expect((await state.json()).expiresIn).toBeGreaterThan(1790);
  for (const change of [{}, { expired: true }, { used: true }]) {
    await page.request.post(`${authURL}/__test__/otp-state`, {
      data: { email, ...change },
    });
    await input.fill(Object.keys(change).length ? "123456" : "000000");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.locator("#login-error-token")).toContainText(
      "Mã không đúng, đã hết hạn hoặc đã được sử dụng",
    );
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await expect(page).toHaveURL(/\/login\?next=\/profile$/);
  }
});

test("OTP shows network and rate-limit errors, retains draft and recovers", async ({
  page,
}) => {
  await page.goto("/login");
  const email = `${randomUUID()}@example.test`;
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.route("**/auth/v1/otp*", (route) => route.abort());
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Không thể kết nối",
  );
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await page.unroute("**/auth/v1/otp*");
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  const input = page.getByLabel("Mã xác nhận", { exact: true });
  await input.fill("123456");
  await page.route("**/auth/v1/verify", (route) =>
    route.fulfill({
      status: 429,
      json: { code: "over_request_rate_limit", message: "Too many requests" },
    }),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Bạn đã thử quá nhiều lần",
  );
  await expect(input).toHaveValue("123456");
  await page.unroute("**/auth/v1/verify");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/overview$/);
});

test("OTP send rate limit is visible before the code step", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page.route("**/auth/v1/otp*", (route) =>
    route.fulfill({
      status: 429,
      json: {
        code: "over_email_send_rate_limit",
        message: "Too many requests",
      },
    }),
  );
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Bạn đã thử quá nhiều lần",
  );
  await expect(
    page.getByRole("button", { name: /^Gửi lại sau/ }),
  ).toBeDisabled();
});

test("OTP English form, error and resend labels follow saved language", async ({
  page,
}) => {
  const { input, email } = await requestCode(page, true);
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#login-token-hint")).toContainText(
    `Enter the code emailed to ${email}`,
  );
  await expect(page.locator("#login-token-hint")).toContainText("30 minutes");
  await input.fill("123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#login-error-token")).toHaveText(
    "Enter all 6 digits of your sign-in code.",
  );
  await expect(page.getByRole("button", { name: /^Resend in/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Change email", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("OTP prevents concurrent send and verify and never redirects without a session", async ({
  page,
}) => {
  let release!: () => void;
  let gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sends = 0;
  await page.route("**/auth/v1/otp*", async (route) => {
    sends++;
    await gate;
    await route.continue();
  });
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  try {
    await expect(page.locator("button[aria-busy=true]")).toBeDisabled();
    await page.locator("form").evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(sends).toBe(1);
  } finally {
    release();
  }
  const input = page.getByLabel("Mã xác nhận", { exact: true });
  await expect(input).toBeFocused();
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let verifies = 0;
  await page.route("**/auth/v1/verify", async (route) => {
    verifies++;
    await gate;
    await route.fulfill({ status: 200, json: { user: { id: randomUUID() } } });
  });
  await input.fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  try {
    await expect(page.locator("button[aria-busy=true]")).toBeDisabled();
    await page.locator("form").evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(verifies).toBe(1);
  } finally {
    release();
  }
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("OTP form fits narrow screens and keyboard navigation in both colour schemes", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { input } = await requestCode(page);
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(input).toBeVisible();
    }
  }
  await input.focus();
  // macOS WebKit's Option-Tab includes buttons when full keyboard access is off.
  const nextControl = info.project.name === "webkit" ? "Alt+Tab" : "Tab";
  await page.keyboard.press(nextControl);
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeFocused();
  await page.keyboard.press(nextControl);
  await expect(
    page.getByRole("button", { name: "Đổi email", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({
    width: info.project.name === "desktop" ? 1440 : 375,
    height: 950,
  });
  await page.screenshot({
    path: info.outputPath("otp-form.png"),
    fullPage: true,
  });
});
