import type { EditorMode } from "./editor-config";
import type { FundView } from "@/domain/funds/types";
import type { FundId, FundTransaction } from "@/domain/funds/schema";

import { actionSchema, type FundAction } from "@/domain/funds/schema";

import { normalizeInteger } from "@/lib/form-values";

import { z } from "zod";

import { localDateTime } from "./content";

import type { Translator } from "@/i18n/translate";

export interface FundActionInput {
  mode: EditorMode;
  entity: string;
  jarIds: string[];
  multipliers: { emergency: string; rainy_day: string; sinking: string };
  priority: FundId[];
  applyLiving: boolean;
  view: Pick<FundView, "source">;
  fields: {
    name: string;
    active: boolean;
    kind: "opening" | "deposit" | "withdraw" | "transfer";
    fundId: "emergency" | "rainy_day" | "sinking";
    locationId: string;
    toFundId: "emergency" | "rainy_day" | "sinking";
    toLocationId: string;
    amount: string;
    occurredAt: string;
    note: string;
    reason: string;
  };
  tr: Translator;
  old: FundTransaction | null;
}

/** Convert the editor draft without changing or submitting it. */
export function buildFundAction({
  mode,
  entity,
  jarIds,
  multipliers,
  priority,
  applyLiving,
  view,
  fields: f,
  tr,
  old,
}: FundActionInput): FundAction {
  if (mode.type === "configure")
    return actionSchema.parse({
      type: "configure",
      id: entity,
      jarIds,
      multipliers,
      priority,
      applyLiving,
      expectedExpenseVersion: view.source.expenseVersion,
      sourceMonth: view.source.month,
    });
  if (mode.type === "location")
    return actionSchema.parse({
      type: "saveLocation",
      id: entity,
      name: f.name,
      active: f.active,
    });
  if (mode.type === "cancel")
    return actionSchema.parse({
      type: "reviseTransaction",
      transactionId: entity,
      replacement: null,
      reason: f.reason,
    });
  const enteredTime = Date.parse(`${f.occurredAt}:00+07:00`);
  if (!Number.isFinite(enteredTime))
    throw new z.ZodError([
      {
        code: "custom",
        path: ["occurredAt"],
        message: tr("Nhập thời điểm giao dịch hợp lệ."),
      },
    ]);
  const transaction = {
    id: entity,
    kind: f.kind,
    fundId: f.fundId,
    locationId: f.locationId,
    amount: normalizeInteger(f.amount),
    occurredAt:
      old && f.occurredAt === localDateTime(old.occurredAt)
        ? old.occurredAt
        : new Date(enteredTime).toISOString(),
    note: f.note,
    ...(f.kind === "transfer"
      ? { toFundId: f.toFundId, toLocationId: f.toLocationId }
      : {}),
  };
  return actionSchema.parse(
    mode.type === "revise"
      ? {
          type: "reviseTransaction",
          transactionId: entity,
          replacement: transaction,
          reason: f.reason,
        }
      : { type: "postTransaction", transaction },
  );
}
