import { timePhase, withFinancialTiming } from "@/server/performance";
import { z } from "zod";
import { authenticatedOwner } from "@/server/auth";
import { reportRepository } from "@/server/database";
import { financialHeaders, financialFailure } from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
import { parseQuery, ReportError } from "@/domain/reports/model";
import { vietnamClock } from "@/domain/shared/clock";
import { readReportDetails } from "@/application/reports";
import { ExpenseError } from "@/domain/expenses/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withFinancialTiming(request, async () => {
    try {
      const owner = await authenticatedOwner(request),
        clock = vietnamClock();
      const raw = Object.fromEntries(new URL(request.url).searchParams);
      const query = parseQuery(raw, clock);
      const { metric, versions, page } = z
        .object({
          metric: z.string().min(1).max(100),
          versions: z.string().min(1).max(2000),
          page: z.coerce.number().int().min(1).max(100000).default(1),
        })
        .parse(raw);
      const result = await timePhase("work", () =>
        readReportDetails(
          reportRepository(),
          owner,
          query,
          clock,
          metric,
          versions,
          page,
        ),
      );
      return jsonResponse(result, {
        headers: financialHeaders,
      });
    } catch (error) {
      return financialFailure(error, {
        accepts: (e): e is ReportError | ExpenseError =>
          e instanceof ReportError || e instanceof ExpenseError,
        log: "Report details API failed",
        unavailable: "Chưa tải được chi tiết. Hãy thử lại.",
      });
    }
  });
}
