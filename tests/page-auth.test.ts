import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { getUser, configured, navigate } = vi.hoisted(() => ({
  getUser: vi.fn(),
  configured: vi.fn(),
  navigate: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: (fn: unknown) => fn,
}));
vi.mock("next/navigation", () => ({
  redirect: navigate,
  unstable_rethrow: () => {},
}));
vi.mock("../src/server/auth", () => ({
  authConfigured: configured,
  serverAuth: async () => ({ auth: { getUser } }),
}));
vi.mock("../src/features/auth/unavailable", () => ({
  AuthUnavailable: () => null,
}));
import { pageAccess, pageSession } from "../src/server/page-auth";
import { safeReturnPath } from "../src/lib/auth-return";
import { modules } from "../src/features/catalog";

beforeEach(() => {
  configured.mockReturnValue(true);
});
afterEach(() => vi.clearAllMocks());

describe("page authorization", () => {
  it("blocks anonymous visitors before rendering a workspace and retains the destination", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError" },
    });
    for (const path of [...modules.map((m) => `/${m.slug}`), "/profile"]) {
      await expect(pageAccess(safeReturnPath(path))).rejects.toThrow(
        `REDIRECT:/login?next=${encodeURIComponent(path)}`,
      );
    }
  });
  it("requires a verified user rather than a cookie claim", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "verified-owner" } },
      error: null,
    });
    expect(await pageSession()).toMatchObject({
      state: "authenticated",
      user: { id: "verified-owner" },
    });
    expect(await pageAccess("/overview")).toBeNull();
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthApiError", status: 401 },
    });
    await expect(pageAccess("/savings")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fsavings",
    );
  });
  it("shows a retry state for outages, rate limits and unknown verification failures", async () => {
    for (const error of [
      { name: "AuthRetryableFetchError", status: 0 },
      { status: 429 },
      { status: 503 },
      { status: 422 },
    ]) {
      getUser.mockResolvedValue({ data: { user: null }, error });
      expect(await pageSession()).toEqual({ state: "unavailable" });
      expect(await pageAccess("/income")).not.toBeNull();
    }
    getUser.mockRejectedValue(new TypeError("Network disconnected"));
    expect(await pageSession()).toEqual({ state: "unavailable" });
    expect(navigate).not.toHaveBeenCalled();
  });
  it("routes missing configuration to the usable login setup state", async () => {
    configured.mockReturnValue(false);
    await expect(pageAccess("/budgets")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fbudgets",
    );
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("safe application destinations", () => {
  it("allows all known module pages and profile", () => {
    for (const path of [...modules.map((m) => `/${m.slug}`), "/profile"])
      expect(safeReturnPath(path)).toBe(path);
  });
  it("rejects external, encoded, nested and public destinations", () => {
    for (const path of [
      undefined,
      null,
      "",
      "/",
      "/login",
      "/auth/callback",
      "//evil.test",
      "https://evil.test",
      "/\\evil.test",
      "%2F%2Fevil.test",
      "/income?next=//evil.test",
      "/profile#x",
      "/missing",
      "/budgets/../login",
    ])
      expect(safeReturnPath(path)).toBe("/overview");
  });
});
