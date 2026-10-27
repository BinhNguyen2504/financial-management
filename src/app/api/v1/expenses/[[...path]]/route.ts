import {
  financialHeaders as headers,
  type FinancialRouteContext as Context,
  financialFailure,
  readCommandJSON,
  checkCommandOrigin,
} from "@/server/financial-api";
import { readExpenseView, runExpenseCommand } from "@/application/expenses";
import { ExpenseError, vietnamClock } from "@/domain/expenses/engine";
import { buildReport } from "@/domain/expenses/reports";
import { commandSchema } from "@/domain/expenses/schema";
import { authenticatedOwner } from "@/server/auth";
import { expenseRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return financialFailure(error, {
    accepts: (error): error is ExpenseError => error instanceof ExpenseError,
    log: "Expense API failed",
    unavailable:
      "Không thể truy cập dữ liệu. Hãy kiểm tra kết nối và thử lại; nội dung đang nhập vẫn được giữ.",
    exposeDomainFields: true,
  });
}
export async function GET(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request);
    const path = (await context.params).path ?? [];
    const clock = vietnamClock();
    const view = await readExpenseView(expenseRepository(), owner, clock);
    const url = new URL(request.url);
    if (!path.length) return jsonResponse(view, { headers });
    if (path.join("/") === "reports") {
      const report = buildReport(
        view.rows,
        {
          year: Number(url.searchParams.get("year") ?? view.currentYear),
          from: Number(url.searchParams.get("from") ?? 1),
          to: Number(url.searchParams.get("to") ?? 12),
          kind: url.searchParams.get("kind") || undefined,
          jarId: url.searchParams.get("jarId") || undefined,
          method: url.searchParams.get("method") || undefined,
          group: url.searchParams.get("group") || undefined,
        },
        view.currentYear,
      );
      return jsonResponse(report, { headers });
    }
    if (path.length === 3 && path[0] === "years" && path[2] === "backup") {
      const year = Number(path[1]);
      const period = view.book?.years.find((y) => y.year === year);
      if (!period || !view.book)
        throw new ExpenseError("Không tìm thấy năm.", 404);
      const rows = view.rows.filter(
        (r) => Number(r.month.slice(0, 4)) === year,
      );
      const backup = {
        schemaVersion: 1,
        year,
        currency: "VND",
        timezone: "Asia/Ho_Chi_Minh",
        exportedAt: clock.now,
        closedAt: period.closedAt,
        status: period.closedAt ? "closed" : "draft",
        bookVersion: view.book.version,
        rows,
        jars: view.book.jars
          .filter((j) => rows.some((r) => r.jarId === j.id))
          .map((j) => ({
            ...j,
            rules: j.rules.filter((r) => r.month <= `${year}-12`),
          })),
        inputs: view.book.inputs.filter(
          (i) => Number(i.month.slice(0, 4)) === year,
        ),
        spends: view.book.spends.filter(
          (s) => Number(s.date.slice(0, 4)) === year,
        ),
        audit: view.book.audit.filter((a) => {
          const d = a.detail as Record<string, unknown>;
          return (
            d.year === year ||
            (a.action === "deleteSpend" &&
              view.book!.spends.some(
                (s) => s.id === d.id && Number(s.date.slice(0, 4)) === year,
              )) ||
            [d.start, d.month, d.date].some(
              (v) => typeof v === "string" && v.startsWith(String(year)),
            )
          );
        }),
      };
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          ...headers,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="expenses-${year}.json"`,
        },
      });
    }
    throw new ExpenseError("Đường dẫn không tồn tại.", 404);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request);
    checkCommandOrigin(request, ExpenseError);
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new ExpenseError("Đường dẫn không tồn tại.", 404);
    const parsed = await readCommandJSON(request, ExpenseError);
    const command = commandSchema.parse(parsed);
    const result = await runExpenseCommand(
      expenseRepository(),
      owner,
      command,
      vietnamClock(),
      path === "preview",
    );
    return jsonResponse(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
