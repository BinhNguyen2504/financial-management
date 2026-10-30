import { readGoalView, runGoalCommand } from "@/application/goals";
import { GoalError } from "@/domain/goals/engine";
import { commandSchema } from "@/domain/goals/schema";
import { vietnamClock } from "@/domain/shared/clock";
import { ExpenseError } from "@/domain/expenses/engine";
import { authenticatedOwner } from "@/server/auth";
import { goalRepository } from "@/server/database";
import { requestDataGeneration } from "@/server/data-generation";
import {
  financialHeaders,
  financialFailure,
  readCommandJSON,
  checkCommandOrigin,
  type FinancialRouteContext,
} from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function failure(error: unknown) {
  return financialFailure(error, {
    accepts: (e): e is GoalError =>
      e instanceof GoalError || e instanceof ExpenseError,
    log: "Goals API failed",
    unavailable:
      "Không thể tải Mục tiêu. Hãy thử lại; nội dung đang nhập được giữ.",
    fullFieldPaths: true,
  });
}
export async function GET(request: Request, context: FinancialRouteContext) {
  try {
    const owner = await authenticatedOwner(request);
    if ((await context.params).path?.length)
      throw new GoalError("Đường dẫn không tồn tại.", 404);
    return jsonResponse(
      await readGoalView(goalRepository(), owner, vietnamClock()),
      { headers: financialHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, context: FinancialRouteContext) {
  try {
    const owner = await authenticatedOwner(request);
    checkCommandOrigin(request, GoalError);
    const path = ((await context.params).path ?? []).join("/");
    if (!["preview", "commands"].includes(path))
      throw new GoalError("Đường dẫn không tồn tại.", 404);
    const command = commandSchema.parse(
      await readCommandJSON(request, GoalError, false),
    );
    return jsonResponse(
      await runGoalCommand(
        goalRepository(requestDataGeneration(request)),
        owner,
        command,
        vietnamClock(),
        path === "preview",
      ),
      { headers: financialHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
