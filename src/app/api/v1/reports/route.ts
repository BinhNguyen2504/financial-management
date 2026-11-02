import { authenticatedOwner } from "@/server/auth";
import { reportRepository } from "@/server/database";
import { financialHeaders, financialFailure } from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
import { parseQuery, ReportError } from "@/domain/reports/model";
import { vietnamClock } from "@/domain/shared/clock";
import { readReport } from "@/application/reports";
import { ExpenseError } from "@/domain/expenses/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const owner = await authenticatedOwner(request),
      clock = vietnamClock();
    const query = parseQuery(
      Object.fromEntries(new URL(request.url).searchParams),
      clock,
    );
    return jsonResponse(
      (await readReport(reportRepository(), owner, query, clock)).report,
      { headers: financialHeaders },
    );
  } catch (error) {
    return financialFailure(error, {
      accepts: (e): e is ReportError | ExpenseError =>
        e instanceof ReportError || e instanceof ExpenseError,
      log: "Reports API failed",
      unavailable: "Chưa tải được Báo cáo. Hãy thử lại.",
    });
  }
}
