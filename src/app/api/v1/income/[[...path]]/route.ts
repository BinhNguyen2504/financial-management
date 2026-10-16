import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticatedOwner } from "@/server/auth";
import { incomeRepository } from "@/server/database";
import { readIncomeView, runIncomeCommand } from "@/application/income";
import { IncomeError, incomeClock } from "@/domain/income/engine";
import { ExpenseError } from "@/domain/expenses/engine";
import { commandSchema, yearSchema } from "@/domain/income/schema";
import {
  buildReport,
  reportFilterSchema,
  reportCSV,
} from "@/domain/income/reports";
import { sameOrigin } from "@/server/request-origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
};
type Context = { params: Promise<{ path?: string[] }> };
function failure(error: unknown) {
  if (error instanceof IncomeError || error instanceof ExpenseError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        code: "INVALID_INPUT",
      },
      { status: 422, headers },
    );
  console.error("Income API failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return NextResponse.json(
    {
      error:
        "Không thể truy cập dữ liệu. Kiểm tra kết nối và thử lại; nội dung đang nhập vẫn được giữ.",
      code: "STORAGE_UNAVAILABLE",
    },
    { status: 503, headers },
  );
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
    if (!path) return NextResponse.json(view, { headers });
    const filter = reportFilterSchema.parse({
      year,
      from: Number(url.searchParams.get("from") ?? 1),
      to: Number(url.searchParams.get("to") ?? 12),
      kind: url.searchParams.get("kind") ?? "all",
      categoryId: url.searchParams.get("categoryId") || undefined,
    });
    const report = buildReport(view, filter);
    if (url.searchParams.get("format") === "csv")
      return new NextResponse(reportCSV(report), {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="income-${year}-${filter.from}-${filter.to}.csv"`,
        },
      });
    return NextResponse.json(report, { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request);
    if (!request.headers.get("authorization") && !sameOrigin(request))
      throw new IncomeError(
        "Nguồn yêu cầu không hợp lệ.",
        403,
        "INVALID_ORIGIN",
      );
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new IncomeError("Đường dẫn không tồn tại.", 404);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new IncomeError("Yêu cầu phải là JSON.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 100_000)
      throw new IncomeError("Yêu cầu quá lớn.", 413);
    const body = await request.text();
    if (body.length > 100_000) throw new IncomeError("Yêu cầu quá lớn.", 413);
    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      throw new IncomeError("JSON không hợp lệ.", 400);
    }
    const result = await runIncomeCommand(
      incomeRepository(),
      owner,
      commandSchema.parse(input),
      incomeClock(),
      path === "preview",
    );
    return NextResponse.json(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
