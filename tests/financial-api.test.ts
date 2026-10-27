import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ExpenseError } from "../src/domain/expenses/engine";
import { FundError } from "../src/domain/funds/engine";
import {
  financialFailure,
  financialHeaders,
  readCommandJSON,
} from "../src/server/financial-api";

afterEach(() => vi.restoreAllMocks());
function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/v1/expenses/commands", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("financial HTTP boundary compatibility", () => {
  it("retains JSON parsing failures and each module's content-length policy", async () => {
    await expect(
      readCommandJSON(request("{"), ExpenseError),
    ).rejects.toMatchObject({ status: 400, message: "JSON không hợp lệ." });
    await expect(
      readCommandJSON(
        request("{}", { "content-type": "text/plain" }),
        ExpenseError,
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readCommandJSON(
        request("{}", { "content-length": "100001" }),
        ExpenseError,
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(
      await readCommandJSON(
        request("{}", { "content-length": "100001" }),
        FundError,
        false,
      ),
    ).toEqual({});
    await expect(
      readCommandJSON(request(" ".repeat(100001)), FundError, false),
    ).rejects.toMatchObject({ status: 413 });
    expect(
      await readCommandJSON(
        request('{"amount":"999999999999999999999999"}'),
        ExpenseError,
      ),
    ).toEqual({ amount: "999999999999999999999999" });
  });

  it("retains private response headers and module-specific field exposure", async () => {
    const error = new ExpenseError("Domain issue", 409, "VERSION_CONFLICT", {
      amount: "Bad amount",
    });
    const options = {
      accepts: (value: unknown): value is ExpenseError =>
        value instanceof ExpenseError,
      log: "Expense API failed",
      unavailable: "Unavailable",
    };
    const exposed = financialFailure(error, {
      ...options,
      exposeDomainFields: true,
    });
    expect(exposed.status).toBe(409);
    for (const [key, value] of Object.entries(financialHeaders))
      expect(exposed.headers.get(key)).toBe(value);
    expect(await exposed.json()).toEqual({
      error: "Domain issue",
      code: "VERSION_CONFLICT",
      fieldErrors: { amount: "Bad amount" },
    });
    expect(await financialFailure(error, options).json()).toEqual({
      error: "Domain issue",
      code: "VERSION_CONFLICT",
    });
  });

  it("preserves full-path Fund field errors while logging no financial diagnostics", async () => {
    const result = z
      .object({
        settings: z.object({ amount: z.string().min(1, "Bad amount") }),
      })
      .safeParse({ settings: { amount: "" } });
    if (result.success) throw new Error("Expected invalid fixture");
    const options = {
      accepts: (value: unknown): value is ExpenseError =>
        value instanceof ExpenseError,
      log: "Fund API failed",
      unavailable: "Unavailable",
      fullFieldPaths: true,
    };
    const response = financialFailure(result.error, options);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "INVALID_INPUT",
      fieldErrors: { "settings.amount": "Bad amount" },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = financialFailure(
      new Error("secret SQL and amounts"),
      options,
    );
    expect(failure.status).toBe(503);
    expect(await failure.json()).toEqual({
      error: "Unavailable",
      code: "STORAGE_UNAVAILABLE",
    });
    expect(log).toHaveBeenCalledExactlyOnceWith("Fund API failed", {
      name: "Error",
    });
  });
});
