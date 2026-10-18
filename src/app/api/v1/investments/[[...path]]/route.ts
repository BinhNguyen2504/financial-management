import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticatedOwner } from "@/server/auth";
import { investmentRepository } from "@/server/database";
import {
  readInvestmentView,
  runInvestmentCommand,
} from "@/application/investments";
import {
  investmentClock,
  InvestmentError,
  endOfMonth,
} from "@/domain/investments/engine";
import { ExpenseError } from "@/domain/expenses/engine";
import {
  commandSchema,
  dateSchema,
  monthSchema,
} from "@/domain/investments/schema";
import {
  buildReport,
  reportCSV,
  reportFilterSchema,
} from "@/domain/investments/reports";
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
  if (error instanceof InvestmentError || error instanceof ExpenseError)
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
  console.error("Investment API failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return NextResponse.json(
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
    if (!path) return NextResponse.json(view, { headers });
    if (path === "backup")
      return NextResponse.json(
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
      return new NextResponse(reportCSV(report), {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="investments-${filter.from}-${filter.to}.csv"`,
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
      throw new InvestmentError(
        "Nguồn yêu cầu không hợp lệ.",
        403,
        "INVALID_ORIGIN",
      );
    const path = ((await context.params).path ?? []).join("/");
    if (path !== "commands" && path !== "preview")
      throw new InvestmentError("Đường dẫn không tồn tại.", 404);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new InvestmentError("Yêu cầu phải là JSON.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 100_000)
      throw new InvestmentError("Yêu cầu quá lớn.", 413);
    const text = await request.text();
    if (text.length > 100_000)
      throw new InvestmentError("Yêu cầu quá lớn.", 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new InvestmentError("JSON không hợp lệ.", 400);
    }
    const result = await runInvestmentCommand(
      investmentRepository(),
      owner,
      commandSchema.parse(body),
      investmentClock(),
      path === "preview",
    );
    return NextResponse.json(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
