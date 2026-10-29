import { z } from "zod";
import { authenticatedOwner } from "@/server/auth";
import { overviewRepository, overviewDataRepository } from "@/server/database";
import { financialHeaders, financialFailure } from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
import { ExpenseError } from "@/domain/expenses/engine";
import { vietnamClock } from "@/domain/shared/clock";
import { widgetIds } from "@/domain/overview/layout";
import { readOverview } from "@/application/overview";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const owner = await authenticatedOwner(request),
      clock = vietnamClock();
    const raw = new URL(request.url).searchParams.get("widgets");
    const requested =
      raw === null
        ? null
        : z
            .array(z.enum(widgetIds))
            .max(10)
            .parse(raw ? raw.split(",") : []);
    const layout = await overviewRepository().read(owner);
    const widgets = requested ?? layout.widgets;
    const result = await readOverview(
      widgets,
      overviewDataRepository().loaders(owner, clock, widgets),
      clock,
    );
    return jsonResponse({ ...result, layout }, { headers: financialHeaders });
  } catch (error) {
    return financialFailure(error, {
      accepts: (e): e is ExpenseError => e instanceof ExpenseError,
      log: "Overview API failed",
      unavailable: "Chưa tải được Tổng quan. Hãy thử lại.",
    });
  }
}
