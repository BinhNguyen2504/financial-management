import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { completeTestEmailLogin } from "./helpers/test-email-login";

async function login(page: Page, path = "/goals") {
  const email = `${randomUUID()}@example.test`;
  await page.goto(`/login?next=${path}`);
  const verification = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/auth/v1/verify",
  );
  await completeTestEmailLogin(page, email);
  const auth = new URL((await verification).url()).origin;
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(
    page.getByRole("button", { name: "Tạo mục tiêu đầu tiên", exact: true }),
  ).toBeVisible();
  return { email, auth };
}

test("cookie APIs verify Auth once, refresh expired cookies and reject revoked sessions", async ({
  page,
  context,
  playwright,
}) => {
  const { auth } = await login(page);
  const cookie = (await context.cookies()).find((c) =>
    /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name),
  )!;
  expect(cookie).toBeDefined();
  const name = cookie.name.replace(/\.\d+$/, "");
  // A separate fixture identity isolates the API probe from route prefetches.
  const email = `${randomUUID()}@example.test`;
  expect(
    (await page.request.post(`${auth}/auth/v1/otp`, { data: { email } })).ok(),
  ).toBe(true);
  const session = await (
    await page.request.post(`${auth}/auth/v1/verify`, {
      data: { email, type: "email", token: "12345678" },
    })
  ).json();
  const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const probe = await playwright.request.newContext({
    baseURL: process.env.TEST_BASE_URL!,
    storageState: {
      cookies: [{ ...cookie, name, value: encoded }],
      origins: [],
    },
  });
  try {
    const response = await probe.get("/api/v1/goals");
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    const counters = await (
      await probe.post(`${auth}/__test__/request-counts`, { data: { email } })
    ).json();
    expect(counters.user).toBe(1);
    session.expires_at = Math.floor(Date.now() / 1000) - 3600;
    const expired = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
    const result = await probe.get("/api/v1/goals", {
      headers: { cookie: `${name}=${expired}` },
    });
    expect(result.ok(), await result.text()).toBe(true);
    expect(result.headers()["set-cookie"]).toContain(name);
    const next = (await probe.storageState()).cookies.filter((c) =>
      c.name.startsWith(name),
    );
    expect(next.map((c) => c.value).join("")).not.toBe(encoded);
    expect(
      (
        await (
          await probe.post(`${auth}/__test__/request-counts`, {
            data: { email },
          })
        ).json()
      ).refresh,
    ).toBeGreaterThan(0);
    await probe.post(`${auth}/__test__/auth-state`, {
      data: { email, revoke: true },
    });
    expect((await probe.get("/api/v1/goals")).status()).toBe(401);
  } finally {
    await probe.dispose();
  }
});

test("Goals preview and save update the screen without a follow-up GET", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Tạo mục tiêu", exact: true }).click();
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Tên mục tiêu", { exact: true })
    .fill("Kế hoạch không chờ tải lại");
  await dialog
    .getByLabel("Số tiền đích (VND)", { exact: true })
    .fill("1000000");
  const requests: { method: string; path: string }[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/goals"))
      requests.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
      });
  });
  await dialog
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    dialog.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toBeVisible();
  const saved = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/v1/goals/commands",
  );
  await dialog
    .getByRole("button", { name: "Xác nhận lưu", exact: true })
    .click();
  const result = await saved;
  expect(new URL(result.url()).searchParams.get("return")).toBe("view");
  expect((await result.json()).view.book.version).toBe(1);
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", {
      name: "Kế hoạch không chờ tải lại",
      exact: true,
    }),
  ).toBeVisible();
  expect(requests).toEqual([
    { method: "POST", path: "/api/v1/goals/preview" },
    { method: "POST", path: "/api/v1/goals/commands" },
  ]);
});

test("Settings coalesces foreground events and retries a failed status read", async ({
  page,
}) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.locator("#backup-file")).toBeEnabled();
  const now = Date.now();
  await page.clock.setFixedTime(now);
  let reads = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/data/status", async (route) => {
    reads++;
    await gate;
    await route.fulfill({
      status: 503,
      json: { error: "Temporary test interruption" },
    });
  });
  const foreground = () =>
    page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
  await page.clock.setFixedTime(now + 61_000);
  await foreground();
  await expect.poll(() => reads).toBe(1);
  await foreground();
  expect(reads).toBe(1);
  release();
  await expect(
    page.getByText("Temporary test interruption", { exact: true }),
  ).toBeVisible();
  await page.clock.setFixedTime(now + 67_000);
  await page.unroute("**/api/v1/data/status");
  const retry = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/v1/data/status",
  );
  await foreground();
  expect((await retry).ok()).toBe(true);
  await expect(page.locator("#backup-file")).toBeEnabled();
});

test("shared action menus keep reload controls inside narrow viewports", async ({
  page,
}) => {
  await login(page);
  for (const path of ["/savings", "/investments", "/reports"]) {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      const trigger = page.locator(".action-options-trigger");
      await expect(trigger).toBeVisible();
      await trigger.click();
      const body = page.locator(".action-options-body");
      const bounds = await body.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(19);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 19);
      const reload = body.getByRole("button", { name: "Tải lại", exact: true });
      if (await reload.count()) {
        await reload.click();
        await expect(page.locator(".loading-status")).toHaveCount(0);
      }
      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
  }
});

test("a late GET cannot replace a committed Goals view or discard its draft", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Tạo mục tiêu", exact: true }).click();
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Tên mục tiêu", { exact: true })
    .fill("Giữ kết quả đã lưu");
  await dialog
    .getByLabel("Số tiền đích (VND)", { exact: true })
    .fill("1000000");
  let release!: () => void, captured!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    captured = resolve;
  });
  await page.route("**/api/v1/goals", async (route) => {
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await page.clock.setFixedTime(Date.now() + 61_000);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await ready;
    await expect(
      dialog.getByLabel("Tên mục tiêu", { exact: true }),
    ).toHaveValue("Giữ kết quả đã lưu");
    await dialog
      .getByRole("button", { name: "Xem trước thay đổi", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Xác nhận lưu", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    const heading = page.getByRole("heading", {
      name: "Giữ kết quả đã lưu",
      exact: true,
    });
    await expect(heading).toBeVisible();
    const late = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/v1/goals",
    );
    release();
    await (await late).finished();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(heading).toBeVisible();
  } finally {
    release();
  }
});
