import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createRefreshController } from "@/lib/foreground-refresh";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

test("a short return reuses the view; stale paired events cause one request", async () => {
  const load = vi.fn(async () => "view");
  const controller = createRefreshController(load);
  await controller.reload();
  vi.advanceTimersByTime(59_999);
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  vi.advanceTimersByTime(1);
  const refresh = controller.refreshIfNeeded("return");
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  expect(controller.refreshIfNeeded("online")).toBeUndefined();
  await refresh;
  expect(load).toHaveBeenCalledTimes(2);
});

test("foreground events never duplicate even a very slow initial request", async () => {
  let release!: () => void;
  const load = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const controller = createRefreshController(load);
  const initial = controller.reload();
  vi.advanceTimersByTime(120_000);
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  expect(controller.refreshIfNeeded("online")).toBeUndefined();
  release();
  await initial;
  expect(load).toHaveBeenCalledTimes(1);
});

test("reconnection bypasses freshness but suppresses adjacent duplicate events", async () => {
  const load = vi.fn(async () => "view");
  const controller = createRefreshController(load);
  await controller.reload();
  vi.advanceTimersByTime(5_000);
  await controller.refreshIfNeeded("online");
  expect(controller.refreshIfNeeded("online")).toBeUndefined();
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  expect(load).toHaveBeenCalledTimes(2);
});

test("a new Vietnam date bypasses freshness even before a minute has elapsed", async () => {
  vi.setSystemTime(new Date("2026-12-31T16:59:50Z"));
  const load = vi.fn(async () => "view");
  const controller = createRefreshController(load);
  await controller.reload();
  vi.advanceTimersByTime(10_000);
  await controller.refreshIfNeeded("return");
  expect(load).toHaveBeenCalledTimes(2);
});

test("failed reads become retryable after a short cooldown without a focus storm", async () => {
  const load = vi.fn(async () => {
    throw new Error("offline");
  });
  const controller = createRefreshController(load);
  await expect(controller.reload()).rejects.toThrow("offline");
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  vi.advanceTimersByTime(5_000);
  await expect(controller.refreshIfNeeded("return")).rejects.toThrow("offline");
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  expect(load).toHaveBeenCalledTimes(2);
});

test("explicit retry, mutation reads and midnight reads always bypass freshness", async () => {
  const load = vi.fn(async () => "view");
  const controller = createRefreshController(load);
  await controller.reload();
  await controller.reload();
  await controller.reload();
  expect(load).toHaveBeenCalledTimes(3);
});

test("a superseded failure cannot invalidate a more recent successful read", async () => {
  let reject!: (error: Error) => void;
  const load = vi
    .fn<() => Promise<string>>()
    .mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    )
    .mockResolvedValue("fresh");
  const controller = createRefreshController(load);
  const old = controller.reload();
  await controller.reload();
  reject(new Error("old failure"));
  await expect(old).rejects.toThrow("old failure");
  vi.advanceTimersByTime(5_000);
  expect(controller.refreshIfNeeded("return")).toBeUndefined();
  expect(load).toHaveBeenCalledTimes(2);
});
