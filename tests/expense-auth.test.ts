import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
import { authenticatedOwner } from "../src/server/auth";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("Auth verification and service failures", () => {
  it("does not treat a temporary Auth outage as a logout that discards drafts", async () => {
    for (const error of [
      { name: "AuthRetryableFetchError", status: 0 },
      { name: "AuthApiError", status: 503 },
      { name: "AuthApiError", status: 429 },
    ]) {
      getUser.mockResolvedValue({ data: { user: null }, error });
      await expect(authenticatedOwner()).rejects.toMatchObject({
        status: 503,
        code: "AUTH_UNAVAILABLE",
      });
    }
  });
  it("requires login for invalid or missing sessions", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", status: 400 },
    });
    await expect(authenticatedOwner()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });
  it("returns only the verified owner, without accepting client ownership data", async () => {
    const id = "10000000-0000-4000-8000-000000000001";
    getUser.mockResolvedValue({ data: { user: { id } }, error: null });
    expect(await authenticatedOwner()).toBe(id);
    expect(getUser).toHaveBeenCalledTimes(1);
  });
  it("reports missing configuration explicitly", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(authenticatedOwner()).rejects.toMatchObject({
      status: 503,
      code: "NOT_CONFIGURED",
    });
    expect(getUser).not.toHaveBeenCalled();
  });
});
