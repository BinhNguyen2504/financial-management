import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "../src/proxy";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it.each([
  "/",
  "/?utm_source=test",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
])(
  "serves public crawler resources without consulting Auth: %s",
  async (path) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "local-test-key");
    const response = await proxy(
      new NextRequest(`https://finance.example.com${path}`),
    );
    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.get("cache-control")).not.toBe("private, no-store");
  },
);

it("still refreshes Auth on private paths and lookalike crawler URLs", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "local-test-key");
  const getUser = vi.fn().mockResolvedValue({ data: { user: null } });
  vi.mocked(createServerClient).mockReturnValue({ auth: { getUser } } as never);
  for (const path of [
    "/overview",
    "/robots.txt/private",
    "/sitemap.xml/private",
  ]) {
    await proxy(new NextRequest(`https://finance.example.com${path}`));
  }
  expect(getUser).toHaveBeenCalledTimes(3);
});
