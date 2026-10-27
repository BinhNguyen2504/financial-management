import {
  financialHeaders as headers,
  type FinancialRouteContext as Context,
  financialFailure,
  readCommandJSON,
  checkCommandOrigin,
} from "@/server/financial-api";
import { readFundView, runFundCommand } from "@/application/funds";
import { ExpenseError, vietnamClock } from "@/domain/expenses/engine";
import { FundError } from "@/domain/funds/engine";
import { commandSchema } from "@/domain/funds/schema";
import { authenticatedOwner } from "@/server/auth";
import { fundRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return financialFailure(error, {
    accepts: (error): error is FundError =>
      error instanceof FundError || error instanceof ExpenseError,
    log: "Fund API failed",
    unavailable:
      "Không thể truy cập dữ liệu. Kiểm tra kết nối rồi thử lại; nội dung đang nhập được giữ.",
    fullFieldPaths: true,
  });
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
    checkCommandOrigin(request, FundError);
    const path = ((await context.params).path ?? []).join("/");
    if (!["commands", "preview"].includes(path))
      throw new FundError("Đường dẫn không tồn tại.", 404);
    const raw = await readCommandJSON(request, FundError, false);
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
