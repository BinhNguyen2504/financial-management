import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { ZodError } from "zod";
import { jsonResponse } from "./json-response";
import { sameOrigin } from "./request-origin";

export const financialHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
};

export type FinancialRouteContext = {
  params: Promise<{ path?: string[] }>;
};

interface DomainFailure extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;
}
type ErrorConstructor = new (
  message: string,
  status: number,
  code?: string,
) => DomainFailure;

export function checkCommandOrigin(
  request: Request,
  ErrorType: ErrorConstructor,
) {
  if (!request.headers.get("authorization") && !sameOrigin(request))
    throw new ErrorType("Nguồn yêu cầu không hợp lệ.", 403, "INVALID_ORIGIN");
}

export async function readCommandJSON(
  request: Request,
  ErrorType: ErrorConstructor,
  checkContentLength = true,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ErrorType("Yêu cầu phải là JSON.", 415);
  if (
    checkContentLength &&
    Number(request.headers.get("content-length") ?? 0) > 100_000
  )
    throw new ErrorType("Yêu cầu quá lớn.", 413);
  const text = await request.text();
  if (text.length > 100_000) throw new ErrorType("Yêu cầu quá lớn.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new ErrorType("JSON không hợp lệ.", 400);
  }
}

export function financialFailure(
  error: unknown,
  options: {
    accepts: (error: unknown) => error is DomainFailure;
    log: string;
    unavailable: string;
    exposeDomainFields?: boolean;
    fullFieldPaths?: boolean;
  },
) {
  if (options.accepts(error))
    return jsonResponse(
      {
        error: error.message,
        code: error.code,
        ...(options.exposeDomainFields && error.fieldErrors
          ? { fieldErrors: error.fieldErrors }
          : {}),
      },
      { status: error.status, headers: financialHeaders },
    );
  if (error instanceof ZodError)
    return jsonResponse(
      {
        error: Object.values(fieldErrorsFromIssues(error.issues)).join("; "),
        code: "INVALID_INPUT",
        fieldErrors: fieldErrorsFromIssues(
          error.issues,
          options.fullFieldPaths,
        ),
      },
      { status: 422, headers: financialHeaders },
    );
  // Log only the error name: SQL diagnostics may include private financial data.
  console.error(options.log, {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return jsonResponse(
    { error: options.unavailable, code: "STORAGE_UNAVAILABLE" },
    { status: 503, headers: financialHeaders },
  );
}
