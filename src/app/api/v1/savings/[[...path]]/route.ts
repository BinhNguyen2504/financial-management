import { readSavingsView, runSavingsCommand } from "@/application/savings";
import { ExpenseError } from "@/domain/expenses/engine";
import {
  endOfMonth,
  savingsClock,
  SavingsError,
} from "@/domain/savings/engine";
import {
  buildReport,
  reportCSV,
  reportFilterSchema,
} from "@/domain/savings/reports";
import {
  commandSchema,
  dateSchema,
  monthSchema,
} from "@/domain/savings/schema";
import { localeOf } from "@/i18n/locale";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { authenticatedOwner } from "@/server/auth";
import { savingsRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
import { sameOrigin } from "@/server/request-origin";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
};
type Context = { params: Promise<{ path?: string[] }> };
function failure(error: unknown) {
  if (error instanceof SavingsError || error instanceof ExpenseError)
    return jsonResponse(
      { error: error.message, code: error.code },
      { status: error.status, headers },
    );
  if (error instanceof ZodError)
    return jsonResponse(
      {
        error: Object.values(fieldErrorsFromIssues(error.issues)).join("; "),
        code: "INVALID_INPUT",
        fieldErrors: fieldErrorsFromIssues(error.issues),
      },
      { status: 422, headers },
    );
  console.error("Savings API failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return jsonResponse(
    {
      error:
        "Không thể truy cập dữ liệu. Kiểm tra kết nối rồi thử lại; nội dung đang nhập được giữ.",
      code: "STORAGE_UNAVAILABLE",
    },
    { status: 503, headers },
  );
}
export async function GET(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request),
      path = ((await context.params).path ?? []).join("/"),
      url = new URL(request.url),
      clock = savingsClock();
    if (path && !["reports", "backup"].includes(path))
      throw new SavingsError("Đường dẫn không tồn tại.", 404);
    const month = monthSchema.parse(
      url.searchParams.get("month") ?? clock.today.slice(0, 7),
    );
    const date = dateSchema.parse(
      url.searchParams.get("asOf") ?? endOfMonth(month),
    );
    const view = await readSavingsView(savingsRepository(), owner, date, clock);
    if (!path) return jsonResponse(view, { headers });
    if (path === "backup")
      return jsonResponse(
        {
          format: "financial-manager-savings",
          schemaVersion: 1,
          exportedAt: clock.now,
          book: view.book,
        },
        {
          headers: {
            ...headers,
            "Content-Disposition": `attachment; filename="savings-backup-${clock.today}.json"`,
          },
        },
      );
    const filter = reportFilterSchema.parse({
      from: url.searchParams.get("from") ?? `${clock.today.slice(0, 4)}-01-01`,
      to: url.searchParams.get("to") ?? clock.today,
      categoryId: url.searchParams.get("categoryId") || undefined,
      kind: url.searchParams.get("kind") || undefined,
      transactionKind: url.searchParams.get("transactionKind") || undefined,
    });
    const report = buildReport(view.book, filter, clock);
    if (url.searchParams.get("format") === "csv")
      return new NextResponse(
        reportCSV(report, localeOf(url.searchParams.get("locale"))),
        {
          headers: {
            ...headers,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="savings-${filter.from}-${filter.to}.csv"`,
          },
        },
      );
    return jsonResponse(report, { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request);
    if (!request.headers.get("authorization") && !sameOrigin(request))
      throw new SavingsError(
        "Nguồn yêu cầu không hợp lệ.",
        403,
        "INVALID_ORIGIN",
      );
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new SavingsError("Đường dẫn không tồn tại.", 404);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new SavingsError("Yêu cầu phải là JSON.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 100_000)
      throw new SavingsError("Yêu cầu quá lớn.", 413);
    const text = await request.text();
    if (text.length > 100_000) throw new SavingsError("Yêu cầu quá lớn.", 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new SavingsError("JSON không hợp lệ.", 400);
    }
    const result = await runSavingsCommand(
      savingsRepository(),
      owner,
      commandSchema.parse(body),
      savingsClock(),
      path === "preview",
    );
    return jsonResponse(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
