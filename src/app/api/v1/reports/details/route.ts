import { z } from "zod";
import { authenticatedOwner } from "@/server/auth";
import { reportRepository } from "@/server/database";
import { financialHeaders, financialFailure } from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
import { parseQuery, ReportError } from "@/domain/reports/model";
import { reportDetails } from "@/domain/reports/build";
import { vietnamClock } from "@/domain/shared/clock";
import { readReport } from "@/application/reports";
import { ExpenseError } from "@/domain/expenses/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
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
    const result = await readReport(reportRepository(), owner, query, clock);
    return jsonResponse(reportDetails(result, metric, versions, page), {
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
}
