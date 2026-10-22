import { readFundView, runFundCommand } from "@/application/funds";
import { ExpenseError, vietnamClock } from "@/domain/expenses/engine";
import { FundError } from "@/domain/funds/engine";
import { commandSchema } from "@/domain/funds/schema";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { authenticatedOwner } from "@/server/auth";
import { fundRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
import { sameOrigin } from "@/server/request-origin";
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
  if (error instanceof FundError || error instanceof ExpenseError)
    return jsonResponse(
      { error: error.message, code: error.code },
      { status: error.status, headers },
    );
  if (error instanceof ZodError)
    return jsonResponse(
      {
        error: Object.values(fieldErrorsFromIssues(error.issues)).join("; "),
        code: "INVALID_INPUT",
        fieldErrors: fieldErrorsFromIssues(error.issues, true),
      },
      { status: 422, headers },
    );
  console.error("Fund API failed", {
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
    const owner = await authenticatedOwner(request);
    if ((await context.params).path?.length)
      throw new FundError("Đường dẫn không tồn tại.", 404);
    return jsonResponse(
      await readFundView(fundRepository(), owner, vietnamClock()),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const owner = await authenticatedOwner(request);
    if (!request.headers.get("authorization") && !sameOrigin(request))
      throw new FundError("Nguồn yêu cầu không hợp lệ.", 403, "INVALID_ORIGIN");
    const path = ((await context.params).path ?? []).join("/");
    if (!["commands", "preview"].includes(path))
      throw new FundError("Đường dẫn không tồn tại.", 404);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new FundError("Yêu cầu phải là JSON.", 415);
    const text = await request.text();
    if (text.length > 100_000) throw new FundError("Yêu cầu quá lớn.", 413);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new FundError("JSON không hợp lệ.", 400);
    }
    const result = await runFundCommand(
      fundRepository(),
      owner,
      commandSchema.parse(raw),
      vietnamClock(),
      path === "preview",
    );
    return jsonResponse(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
