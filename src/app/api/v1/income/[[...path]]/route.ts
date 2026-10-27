import {
  financialHeaders as headers,
  type FinancialRouteContext as Context,
  financialFailure,
  readCommandJSON,
  checkCommandOrigin,
} from "@/server/financial-api";
import { readIncomeView, runIncomeCommand } from "@/application/income";
import { ExpenseError } from "@/domain/expenses/engine";
import { IncomeError, incomeClock } from "@/domain/income/engine";
import { buildReport, reportFilterSchema } from "@/domain/income/reports";
import { reportCSV } from "@/i18n/report-exports/income";
import { commandSchema, yearSchema } from "@/domain/income/schema";
import { localeOf } from "@/i18n/locale";
import { authenticatedOwner } from "@/server/auth";
import { incomeRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return financialFailure(error, {
    accepts: (error): error is IncomeError =>
      error instanceof IncomeError || error instanceof ExpenseError,
    log: "Income API failed",
    unavailable:
      "Không thể truy cập dữ liệu. Kiểm tra kết nối và thử lại; nội dung đang nhập vẫn được giữ.",
  });
}
export async function GET(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request);
    const path = ((await context.params).path ?? []).join("/");
    if (path && path !== "reports")
      throw new IncomeError("Đường dẫn không tồn tại.", 404);
    const url = new URL(request.url);
    const clock = incomeClock();
    const year = yearSchema.parse(
      Number(url.searchParams.get("year") ?? clock.today.slice(0, 4)),
    );
    const view = await readIncomeView(incomeRepository(), owner, year, clock);
    if (!path) return jsonResponse(view, { headers });
    const filter = reportFilterSchema.parse({
      year,
      from: Number(url.searchParams.get("from") ?? 1),
      to: Number(url.searchParams.get("to") ?? 12),
      kind: url.searchParams.get("kind") ?? "all",
      categoryId: url.searchParams.get("categoryId") || undefined,
    });
    const report = buildReport(view, filter);
    if (url.searchParams.get("format") === "csv")
      return new NextResponse(
        reportCSV(report, localeOf(url.searchParams.get("locale"))),
        {
          headers: {
            ...headers,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="income-${year}-${filter.from}-${filter.to}.csv"`,
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
    checkCommandOrigin(request, IncomeError);
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new IncomeError("Đường dẫn không tồn tại.", 404);
    const input = await readCommandJSON(request, IncomeError);
    const result = await runIncomeCommand(
      incomeRepository(),
      owner,
      commandSchema.parse(input),
      incomeClock(),
      path === "preview",
    );
    return jsonResponse(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
