import { expect, test, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

const slots = (page: Page) => page.locator(".otp-digit");
const values = (page: Page) =>
  slots(page).evaluateAll((elements) =>
    elements.map((e) => (e as HTMLInputElement).value),
  );
async function paste(input: Locator, text: string) {
  // Exercise the actual DOM paste handler in every engine without OS clipboard permissions.
  await input.evaluate((element, content) => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => content },
    });
    element.dispatchEvent(event);
  }, text);
}
async function requestCode(page: Page, english = false) {
  if (english)
    await page
      .context()
      .addCookies([
        { name: "fm-locale", value: "en", url: process.env.TEST_BASE_URL! },
      ]);
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
  await expect(slots(page)).toHaveCount(8);
  await expect(input).toBeFocused();
  return { email, authURL, input };
}

test("OTP eight slots advance per digit and submit the leading-zero code on the last digit", async ({
  page,
  context,
}) => {
  const { email, authURL, input } = await requestCode(page);
  await expect(page.locator("#login-token-hint")).toContainText(email);
  await expect(input).toHaveAttribute("autocomplete", "one-time-code");
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await page.request.post(`${authURL}/__test__/otp-state`, {
    data: { email, token: "01234567" },
  });
  let verifies = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/auth/v1/verify") verifies++;
  });
  for (let index = 0; index < 7; index++) {
    await expect(slots(page).nth(index)).toBeFocused();
    await page.keyboard.press(String(index));
    await expect(slots(page).nth(index)).toHaveValue(String(index));
    await expect(slots(page).nth(index + 1)).toBeFocused();
  }
  expect(verifies).toBe(0);
  const verification = page.waitForRequest(
    (r) => new URL(r.url()).pathname === "/auth/v1/verify",
  );
  await page.keyboard.press("7");
  expect((await verification).postDataJSON()).toMatchObject({
    email,
    token: "01234567",
    type: "email",
  });
  await expect(page).toHaveURL(/\/profile$/);
  expect(verifies).toBe(1);
  // A URL commit can precede the destination document finishing navigation.
  await expect(page.getByLabel("Họ và tên", { exact: true })).toBeVisible();
  await page.waitForLoadState("load");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Thông tin cá nhân", exact: true }),
  ).toBeVisible();
  const replay = await context.request.post(`${authURL}/auth/v1/verify`, {
    data: { email, token: "01234567", type: "email" },
  });
  expect(replay.status()).toBe(403);
});

test("OTP full paste from any slot replaces the code and submits once", async ({
  page,
}) => {
  const { email } = await requestCode(page);
  await slots(page).first().fill("99");
  await expect(slots(page).nth(2)).toBeFocused();
  const request = page.waitForRequest(
    (r) => new URL(r.url()).pathname === "/auth/v1/verify",
  );
  await paste(slots(page).nth(4), " 1234-5678 ");
  expect((await request).postDataJSON()).toMatchObject({
    email,
    token: "12345678",
  });
  await expect(page).toHaveURL(/\/profile$/);
});

test("OTP edits preserve slot positions, support backspace and arrows, and reject incomplete or oversized input", async ({
  page,
}) => {
  const { input } = await requestCode(page);
  let verifies = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/auth/v1/verify") verifies++;
  });
  await paste(input, "1234");
  await expect(slots(page).nth(4)).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(slots(page).nth(3)).toBeFocused();
  expect(await values(page)).toEqual(["1", "2", "3", "", "", "", "", ""]);
  await page.keyboard.press("ArrowLeft");
  await expect(slots(page).nth(2)).toBeFocused();
  await page.keyboard.press("Delete");
  expect(await values(page)).toEqual(["1", "2", "", "", "", "", "", ""]);
  await page.keyboard.press("Home");
  await expect(input).toBeFocused();
  await page.keyboard.press("9");
  await expect(slots(page).nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(slots(page).last()).toBeFocused();
  await page.keyboard.press("8");
  await paste(input, "123456789");
  await paste(input, "abc12345");
  expect(await values(page)).toEqual(["9", "2", "", "", "", "", "", "8"]);
  expect(verifies).toBe(0);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("#login-error-token")).toHaveText(
    "Nhập đủ 8 chữ số của mã đăng nhập.",
  );
  await expect(input).toBeFocused();
  // Editing a filled slot selects/replaces its digit without moving the others.
  await slots(page).nth(1).click();
  await page.keyboard.press("4");
  expect(await values(page)).toEqual(["9", "4", "", "", "", "", "", "8"]);
});

test("OTP resend clears all slots and retains per-email cooldown when changing email", async ({
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
  expect(await values(page)).toEqual(Array(8).fill(""));
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(resend).toBeDisabled();
  // Keep browser navigation on a real clock; verify this replacement challenge via the double.
  const verification = await page.request.post(`${authURL}/auth/v1/verify`, {
    data: { email, token: "12345678", type: "email" },
  });
  expect(verification.status()).toBe(200);
});

test("OTP rejects wrong, expired and used codes without automatically retrying", async ({
  page,
}) => {
  const { email, authURL, input } = await requestCode(page);
  const state = await page.request.post(`${authURL}/__test__/otp-state`, {
    data: { email },
  });
  const { expiresIn } = await state.json();
  expect(expiresIn).toBeGreaterThan(1790);
  expect(expiresIn).toBeLessThanOrEqual(1800);
  let verifies = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/auth/v1/verify") verifies++;
  });
  for (const [index, change] of [
    {},
    { expired: true },
    { used: true },
  ].entries()) {
    await page.request.post(`${authURL}/__test__/otp-state`, {
      data: { email, ...change },
    });
    await input.fill(index ? "12345678" : "00000000");
    await expect(page.locator("#login-error-token")).toContainText(
      "Mã không đúng, đã hết hạn hoặc đã được sử dụng",
    );
    await expect(input).toBeFocused();
    expect(
      await slots(page).evaluateAll((elements) =>
        elements.every((e) => e.getAttribute("aria-invalid") === "true"),
      ),
    ).toBe(true);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeEnabled();
    expect(verifies).toBe(index + 1);
  }
});

test("OTP shows network and rate-limit errors and preserves the eight-digit draft for manual retry", async ({
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
  await page.route("**/auth/v1/verify", (route) =>
    route.fulfill({
      status: 429,
      json: { code: "over_request_rate_limit", message: "Too many requests" },
    }),
  );
  await input.fill("12345678");
  await expect(page.locator("main [role=alert]")).toContainText(
    "Bạn đã thử quá nhiều lần",
  );
  expect((await values(page)).join("")).toBe("12345678");
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

test("OTP English labels and errors describe eight digits and automatic submission", async ({
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
  await expect(
    page.getByText(
      "Enter all 8 digits or paste the code to sign in automatically.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Confirmation code digit 8", { exact: true }),
  ).toBeVisible();
  await input.fill("123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#login-error-token")).toHaveText(
    "Enter all 8 digits of your sign-in code.",
  );
  await expect(page.getByRole("button", { name: /^Resend in/ })).toBeDisabled();
});

test("OTP autofill auto submits once, blocks concurrent confirmation and never redirects without a session", async ({
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
  await input.fill("12345678");
  try {
    await expect(page.locator("button[aria-busy=true]")).toBeDisabled();
    await expect(input).toBeDisabled();
    await paste(input, "12345678");
    await page.locator("form").evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(verifies).toBe(1);
    expect((await values(page)).join("")).toBe("12345678");
  } finally {
    release();
  }
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("OTP eight square slots fit narrow screens and support keyboard navigation in both colour schemes", async ({
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
      const boxes = await slots(page).evaluateAll((elements) =>
        elements.map((e) => {
          const { width, height, top } = e.getBoundingClientRect();
          return { width, height, top };
        }),
      );
      expect(
        boxes.every((b) => Math.abs(b.width - b.height) < 1 && b.width >= 24),
      ).toBe(true);
      expect(boxes.every((b) => Math.abs(b.top - boxes[0].top) < 1)).toBe(true);
      if ([320, 768, 1440].includes(width))
        await page.screenshot({
          path: info.outputPath(`otp-${colorScheme}-${width}.png`),
          fullPage: true,
        });
    }
  }
  await input.focus();
  for (let index = 1; index < 8; index++) {
    await page.keyboard.press("Tab");
    await expect(slots(page).nth(index)).toBeFocused();
  }
  const nextControl = info.project.name === "webkit" ? "Alt+Tab" : "Tab";
  await page.keyboard.press(nextControl);
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeFocused();
  await page.keyboard.press(nextControl);
  await expect(
    page.getByRole("button", { name: "Đổi email", exact: true }),
  ).toBeFocused();
});
