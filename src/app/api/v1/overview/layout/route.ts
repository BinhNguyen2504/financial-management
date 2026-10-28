import { authenticatedOwner } from "@/server/auth";
import { overviewRepository } from "@/server/database";
import {
  financialHeaders,
  financialFailure,
  checkCommandOrigin,
  readCommandJSON,
} from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
import { ExpenseError } from "@/domain/expenses/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function failure(error: unknown) {
  return financialFailure(error, {
    accepts: (e): e is ExpenseError => e instanceof ExpenseError,
    log: "Overview layout failed",
    unavailable: "Chưa tải được bố cục. Hãy thử lại.",
  });
}
export async function GET(request: Request) {
  try {
    return jsonResponse(
      await overviewRepository().read(await authenticatedOwner(request)),
      { headers: financialHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    const owner = await authenticatedOwner(request);
    checkCommandOrigin(request, ExpenseError);
    return jsonResponse(
      await overviewRepository().save(
        owner,
        await readCommandJSON(request, ExpenseError),
      ),
      { headers: financialHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
