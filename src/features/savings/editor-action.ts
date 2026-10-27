import {
  actionSchema,
  transactionSchema,
  type SavingsAction,
  type SavingsTransaction,
} from "@/domain/savings/schema";

import { normalizeInteger } from "@/lib/form-values";

import { type EditorMode } from "./editor-config";

export interface SavingsActionInput {
  transactionId: string;
  fields: Record<string, string>;
  txKind: SavingsTransaction["kind"];
  allocations: Record<string, string>;
  mode: EditorMode;
  entityId: string;
  old: SavingsTransaction | undefined;
}

/** Convert the editor draft without changing or submitting it. */
export function buildSavingsAction({
  transactionId,
  fields: f,
  txKind,
  allocations,
  mode,
  entityId,
  old,
}: SavingsActionInput): SavingsAction {
  function transaction(): SavingsTransaction {
    const b = {
        id: transactionId,
        date: f.date,
        categoryId: f.categoryId,
        note: f.note,
      },
      cash = { cashCategoryId: f.cashCategoryId || null },
      charges = { fee: normalizeInteger(f.fee), tax: normalizeInteger(f.tax) },
      contract = { name: f.name, maturity: f.maturity, term: f.term };
    switch (txKind) {
      case "openingCash":
      case "deposit":
      case "fee":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
        });
      case "openingDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          ...contract,
        });
      case "openingGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          quantity: f.quantity,
          unitPrice: normalizeInteger(f.unitPrice),
        });
      case "withdraw":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          ...charges,
        });
      case "transfer":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          cashCategoryId: f.cashCategoryId,
          ...charges,
        });
      case "openDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          ...contract,
          ...cash,
        });
      case "withdrawDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          amount: normalizeInteger(f.amount),
          interest: normalizeInteger(f.interest),
          ...charges,
          ...cash,
        });
      case "interest":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          amount: normalizeInteger(f.amount),
          capitalize: f.capitalize === "true",
          cashCategoryId: f.capitalize === "true" ? null : cash.cashCategoryId,
        });
      case "rollover":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          interest: normalizeInteger(f.interest),
          reinvestInterest: normalizeInteger(f.reinvestInterest),
          ...contract,
          ...charges,
          ...cash,
        });
      case "buyGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          quantity: f.quantity,
          unitPrice: normalizeInteger(f.unitPrice),
          ...charges,
          ...cash,
        });
      case "sellGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          allocations: Object.entries(allocations)
            .filter(([, q]) => q && q !== "0")
            .map(([lotId, quantity]) => ({ lotId, quantity })),
          unitPrice: normalizeInteger(f.unitPrice),
          ...charges,
          ...cash,
        });
    }
  }
  const metadata = {
    name: f.name,
    description: f.description,
    emoji: f.emoji,
  };
  switch (mode.type) {
    case "create":
      return actionSchema.parse({
        type: "createCategory",
        id: entityId,
        start: f.month,
        kind: f.kind,
        unit: f.kind === "gold" ? f.unit : null,
        ...metadata,
      });
    case "configure":
      return {
        type: "configureCategory",
        categoryId: mode.category.id,
        month: f.month,
        ...metadata,
      };
    case "archive":
    case "restore":
      return {
        type: mode.type === "archive" ? "archiveCategory" : "restoreCategory",
        categoryId: mode.category.id,
        month: f.month,
      };
    case "price":
      return {
        type: "setPrice",
        id: entityId,
        categoryId: f.categoryId,
        date: f.date,
        price: normalizeInteger(f.unitPrice),
      };
    case "close":
      return {
        type: "closeMonth",
        month: f.month,
        acceptStalePrices: f.acceptStalePrices === "true",
      };
    case "reopen":
      return { type: "reopenMonth", month: f.month, reason: f.reason };
    case "void":
      return {
        type: "reviseTransaction",
        transactionId: mode.transaction.id,
        replacement: null,
        reason: f.reason,
      };
    case "transaction":
      return old
        ? {
            type: "reviseTransaction",
            transactionId: old.id,
            replacement: transaction(),
            reason: f.reason,
          }
        : { type: "postTransaction", transaction: transaction() };
  }
}
