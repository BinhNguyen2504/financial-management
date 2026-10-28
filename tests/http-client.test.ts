import { afterEach, describe, expect, it, vi } from "vitest";
import { apiJSON, RequestError } from "../src/features/expenses/api";
import { incomeJSON, IncomeAPIError } from "../src/features/income/api";
import { savingsJSON, SavingsAPIError } from "../src/features/savings/api";
import {
  investmentsJSON,
  InvestmentAPIError,
} from "../src/features/investments/api";
import { fundsJSON, FundAPIError } from "../src/features/funds/api";

afterEach(() => vi.unstubAllGlobals());
const modules = [
  {
    path: "expenses",
    ErrorType: RequestError,
    request: (body?: unknown) =>
      apiJSON(
        "/preview",
        body === undefined
          ? undefined
          : { method: "POST", body: JSON.stringify(body) },
      ),
  },
  {
    path: "income",
    ErrorType: IncomeAPIError,
    request: (body?: unknown) => incomeJSON("/preview", body),
  },
  {
    path: "savings",
    ErrorType: SavingsAPIError,
    request: (body?: unknown) => savingsJSON("/preview", body),
  },
  {
    path: "investments",
    ErrorType: InvestmentAPIError,
    request: (body?: unknown) => investmentsJSON("/preview", body),
  },
  {
    path: "funds",
    ErrorType: FundAPIError,
    request: (body?: unknown) => fundsJSON("/preview", body),
  },
];

describe.each(modules)(
  "$path HTTP compatibility",
  ({ path, ErrorType, request }) => {
    it("keeps exact strings, request paths, JSON writes and no-store reads", async () => {
      const value = { amount: "999999999999999999999999" };
      const fetch = vi
        .fn()
        .mockImplementation(async () => Response.json(value));
      vi.stubGlobal("fetch", fetch);
      expect(await request()).toEqual(value);
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/v1/${path}/preview`,
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(await request(value)).toEqual(value);
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/v1/${path}/preview`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(value),
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      );
    });

    it("retains module error identity and the existing optional status policy", async () => {
      const fetch = vi.fn().mockRejectedValue(new TypeError("network"));
      vi.stubGlobal("fetch", fetch);
      const network = await request().catch((error: unknown) => error);
      expect(network).toBeInstanceOf(ErrorType);
      expect(network).toMatchObject({
        code: "NETWORK_ERROR",
        status: path === "expenses" ? undefined : 0,
      });
      fetch.mockResolvedValue(new Response("not JSON", { status: 502 }));
      const invalid = await request().catch((error: unknown) => error);
      expect(invalid).toBeInstanceOf(ErrorType);
      expect(invalid).toMatchObject({
        code: "INVALID_RESPONSE",
        message: "Chưa nhận được dữ liệu. Hãy thử lại.",
        status: path === "expenses" ? undefined : 502,
      });
      fetch.mockImplementation(async () =>
        Response.json(
          {
            error: "Conflict",
            code: "VERSION_CONFLICT",
            fieldErrors: { amount: "Invalid amount" },
          },
          { status: 409 },
        ),
      );
      const conflict = await request().catch((error: unknown) => error);
      expect(conflict).toBeInstanceOf(ErrorType);
      expect(conflict).toMatchObject({
        message: "Conflict",
        code: "VERSION_CONFLICT",
        status: 409,
        fieldErrors: { amount: "Invalid amount" },
      });
    });

    it("keeps HTTP statuses when a server error reuses a transport error code", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation(async () =>
            Response.json(
              { error: "Server diagnostic", code: "NETWORK_ERROR" },
              { status: 503 },
            ),
          ),
      );
      const error = await request().catch((value: unknown) => value);
      expect(error).toBeInstanceOf(ErrorType);
      expect(error).toMatchObject({ code: "NETWORK_ERROR", status: 503 });
    });
  },
);

it.each(modules.filter(({ path }) => path !== "expenses"))(
  "$path preserves the original network error contract for an unserializable request",
  async ({ request, ErrorType }) => {
    const body: Record<string, unknown> = {};
    body.self = body;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const error = await request(body).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ErrorType);
    expect(error).toMatchObject({ code: "NETWORK_ERROR", status: 0 });
    expect(fetch).not.toHaveBeenCalled();
  },
);
