import type { InvestmentTransaction } from "@/domain/investments/schema";

import {
  actionSchema,
  type InvestmentAction,
} from "@/domain/investments/schema";

import { normalizeInteger } from "@/lib/form-values";

import { type EditorMode } from "./editor-config";

export interface InvestmentActionInput {
  mode: EditorMode;
  entityId: string;
  fields: Record<string, string>;
  old: InvestmentTransaction | null;
  originalId: string;
  kind: InvestmentTransaction["kind"];
}

/** Convert the editor draft without changing or submitting it. */
export function buildInvestmentAction({
  mode,
  entityId,
  fields: f,
  old,
  originalId,
  kind,
}: InvestmentActionInput): InvestmentAction {
  if (mode.type === "create")
    return actionSchema.parse({
      type: "createCategory",
      id: entityId,
      start: f.start,
      kind: f.kind,
      name: f.name,
      emoji: f.emoji,
      description: f.description,
    });
  if (mode.type === "configure")
    return actionSchema.parse({
      type: "configureCategory",
      categoryId: mode.categoryId,
      date: f.date,
      kind: f.kind,
      name: f.name,
      emoji: f.emoji,
      description: f.description,
    });
  if (mode.type === "archive" || mode.type === "restore")
    return actionSchema.parse({
      type: mode.type === "archive" ? "archiveCategory" : "restoreCategory",
      categoryId: mode.categoryId,
      date: f.date,
    });
  if (mode.type === "cancel")
    return actionSchema.parse({
      type: "reviseTransaction",
      transactionId: old!.id,
      replacement: null,
      reason: f.reason,
    });
  const t: Record<string, unknown> = {
    id: originalId,
    kind,
    date: f.date,
    categoryId: f.categoryId,
    note: f.note,
    counterparty: f.counterparty,
  };
  if (
    ["openingCash", "deposit", "withdraw", "transfer", "buy", "sell"].includes(
      kind,
    )
  )
    t.amount = normalizeInteger(f.amount);
  if (["openingInvestment", "sell"].includes(kind))
    t.cost = normalizeInteger(f.cost);
  if (["openingInvestment", "buy", "sell", "valuation"].includes(kind))
    t.value = normalizeInteger(f.value);
  if (kind === "buy" || kind === "sell") {
    t.fee = normalizeInteger(f.fee);
    t.tax = normalizeInteger(f.tax);
    t.cashCategoryId = f.cashCategoryId || null;
  }
  if (kind === "transfer") t.cashCategoryId = f.cashCategoryId;
  return actionSchema.parse(
    mode.type === "revise"
      ? {
          type: "reviseTransaction",
          transactionId: old!.id,
          replacement: t,
          reason: f.reason,
        }
      : { type: "postTransaction", transaction: t },
  );
}
