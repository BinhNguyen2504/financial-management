import { z } from "zod";
import { authenticatedOwner } from "@/server/auth";
import {
  expenseRepository,
  incomeRepository,
  savingsRepository,
  investmentRepository,
  fundRepository,
} from "@/server/database";
import { financialHeaders, financialFailure } from "@/server/financial-api";
import { jsonResponse } from "@/server/json-response";
import { ExpenseError } from "@/domain/expenses/engine";
import { vietnamClock } from "@/domain/shared/clock";
import { widgetIds } from "@/domain/overview/layout";
import {
  expenseSummary,
  incomeSummary,
  savingsSummary,
  investmentSummary,
  fundSummary,
} from "@/domain/overview/summary";
import { readOverview } from "@/application/overview";
import { readExpenseView } from "@/application/expenses";
import { readIncomeView } from "@/application/income";
import { readSavingsView } from "@/application/savings";
import { readInvestmentView } from "@/application/investments";
import { readFundView } from "@/application/funds";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const owner = await authenticatedOwner(request),
      clock = vietnamClock();
    const raw = new URL(request.url).searchParams.get("widgets");
    const widgets = z
      .array(z.enum(widgetIds))
      .max(10)
      .parse(raw === null ? widgetIds.slice(0, 6) : raw ? raw.split(",") : []);
    const result = await readOverview(
      widgets,
      {
        expenses: async () =>
          expenseSummary(
            await readExpenseView(expenseRepository(), owner, clock),
          ),
        income: async () =>
          incomeSummary(
            await readIncomeView(
              incomeRepository(),
              owner,
              Number(clock.today.slice(0, 4)),
              clock,
            ),
          ),
        savings: async () =>
          savingsSummary(
            await readSavingsView(
              savingsRepository(),
              owner,
              clock.today,
              clock,
            ),
          ),
        investments: async () =>
          investmentSummary(
            await readInvestmentView(
              investmentRepository(),
              owner,
              clock.today,
              clock,
            ),
          ),
        funds: async () =>
          fundSummary(await readFundView(fundRepository(), owner, clock)),
      },
      clock,
    );
    return jsonResponse(result, { headers: financialHeaders });
  } catch (error) {
    return financialFailure(error, {
      accepts: (e): e is ExpenseError => e instanceof ExpenseError,
      log: "Overview API failed",
      unavailable: "Chưa tải được Tổng quan. Hãy thử lại.",
    });
  }
}
