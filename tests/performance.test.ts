import { afterEach, expect, it, vi } from "vitest";
import {
  recordStatement,
  timePhase,
  withFinancialTiming,
} from "../src/server/performance";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("leaves diagnostics off by default", async () => {
  vi.stubEnv("FINANCIAL_TIMING", "0");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const response = await withFinancialTiming(
    new Request("https://example.test/api/v1/goals"),
    async () => {
      recordStatement();
      return new Response("{}");
    },
  );
  expect(response.headers.has("Server-Timing")).toBe(false);
  expect(response.headers.has("X-DB-Statements")).toBe(false);
  expect(log).not.toHaveBeenCalled();
});

it("isolates concurrent timing contexts and never logs financial inputs or query strings", async () => {
  vi.stubEnv("FINANCIAL_TIMING", "1");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const responses = await Promise.all(
    [1, 3].map((count) =>
      withFinancialTiming(
        new Request(
          `https://example.test/api/v1/goals/commands?note=private-note&amount=9007199254740993&owner=private-owner`,
          { method: "POST" },
        ),
        async () => {
          await timePhase("auth", async () => {
            await Promise.resolve();
          });
          for (let i = 0; i < count; i++) {
            recordStatement();
            await Promise.resolve();
          }
          return new Response("private-response", {
            headers: { "Cache-Control": "private, no-store" },
          });
        },
      ),
    ),
  );
  expect(responses.map((r) => r.headers.get("X-DB-Statements"))).toEqual([
    "1",
    "3",
  ]);
  for (const response of responses) {
    expect(response.headers.get("Server-Timing")).toMatch(/auth;dur=\d/);
    expect(response.headers.get("Server-Timing")).toMatch(/total;dur=\d/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  }
  expect(log).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(log.mock.calls)).not.toMatch(
    /private-note|private-owner|private-response|9007199254740993|select/i,
  );
});
