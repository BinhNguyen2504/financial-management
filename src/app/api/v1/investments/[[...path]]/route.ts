import {
  financialHeaders as headers,
  type FinancialRouteContext as Context,
  financialFailure,
  readCommandJSON,
  checkCommandOrigin,
} from "@/server/financial-api";
import {
  readInvestmentView,
  runInvestmentCommand,
} from "@/application/investments";
import { ExpenseError } from "@/domain/expenses/engine";
import {
  endOfMonth,
  investmentClock,
  InvestmentError,
} from "@/domain/investments/engine";
import { buildReport, reportFilterSchema } from "@/domain/investments/reports";
import { reportCSV } from "@/i18n/report-exports/investments";
import {
  commandSchema,
  dateSchema,
  monthSchema,
} from "@/domain/investments/schema";
import { localeOf } from "@/i18n/locale";
import { authenticatedOwner } from "@/server/auth";
import { investmentRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return financialFailure(error, {
    accepts: (error): error is InvestmentError =>
      error instanceof InvestmentError || error instanceof ExpenseError,
    log: "Investment API failed",
    unavailable:
      "Không thể truy cập dữ liệu. Kiểm tra kết nối rồi thử lại; nội dung đang nhập được giữ.",
  });
}
export async function GET(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request),
      path = ((await context.params).path ?? []).join("/"),
      url = new URL(request.url),
      clock = investmentClock();
    if (path && !["reports", "backup"].includes(path))
      throw new InvestmentError("Đường dẫn không tồn tại.", 404);
    const month = monthSchema.parse(
      url.searchParams.get("month") ?? clock.today.slice(0, 7),
    );
    const date = dateSchema.parse(
      url.searchParams.get("asOf") ?? endOfMonth(month),
    );
    const view = await readInvestmentView(
      investmentRepository(),
      owner,
      date,
      clock,
    );
    if (!path) return jsonResponse(view, { headers });
    if (path === "backup")
      return jsonResponse(
        {
          format: "financial-manager-investments",
          schemaVersion: 1,
          exportedAt: clock.now,
          book: view.book,
        },
        {
          headers: {
            ...headers,
            "Content-Disposition": `attachment; filename="investments-backup-${clock.today}.json"`,
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
            "Content-Disposition": `attachment; filename="investments-${filter.from}-${filter.to}.csv"`,
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
    checkCommandOrigin(request, InvestmentError);
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new InvestmentError("Đường dẫn không tồn tại.", 404);
    const body = await readCommandJSON(request, InvestmentError);
    const result = await runInvestmentCommand(
      investmentRepository(),
      owner,
      commandSchema.parse(body),
      investmentClock(),
      path === "preview",
    );
    return jsonResponse(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
