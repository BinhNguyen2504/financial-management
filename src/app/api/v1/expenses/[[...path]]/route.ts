import { readExpenseView, runExpenseCommand } from "@/application/expenses";
import { ExpenseError, vietnamClock } from "@/domain/expenses/engine";
import { buildReport } from "@/domain/expenses/reports";
import { commandSchema } from "@/domain/expenses/schema";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { authenticatedOwner } from "@/server/auth";
import { expenseRepository } from "@/server/database";
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
const fieldNames: Record<string, string> = {
  amount: "Số tiền",
  opening: "Số dư đầu kỳ",
  funding: "Tiền thêm theo tháng",
  extra: "Tiền bổ sung",
  closing: "Số dư cuối tháng",
  target: "Mức riêng tháng",
  name: "Tên",
  description: "Mô tả",
  method: "Phương thức",
  group: "Nhóm mục đích",
  month: "Tháng",
  start: "Tháng bắt đầu",
  date: "Ngày sử dụng",
  note: "Ghi chú",
};
function failure(error: unknown) {
  if (error instanceof ExpenseError)
    return jsonResponse(
      {
        error: error.message,
        code: error.code,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
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
  // Do not expose connection strings, SQL details, or financial request payloads.
  console.error("Expense API failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return jsonResponse(
    {
      error:
        "Không thể truy cập dữ liệu. Hãy kiểm tra kết nối và thử lại; nội dung đang nhập vẫn được giữ.",
      code: "STORAGE_UNAVAILABLE",
    },
    { status: 503, headers },
  );
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
    if (!request.headers.get("authorization") && !sameOrigin(request))
      throw new ExpenseError(
        "Nguồn yêu cầu không hợp lệ.",
        403,
        "INVALID_ORIGIN",
      );
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new ExpenseError("Đường dẫn không tồn tại.", 404);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new ExpenseError("Yêu cầu phải là JSON.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 100_000)
      throw new ExpenseError("Yêu cầu quá lớn.", 413);
    const body = await request.text();
    if (body.length > 100_000) throw new ExpenseError("Yêu cầu quá lớn.", 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new ExpenseError("JSON không hợp lệ.", 400);
    }
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
