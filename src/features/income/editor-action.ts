import { type IncomeAction } from "@/domain/income/schema";

import { normalizeInteger } from "@/lib/form-values";

import { type EditorMode } from "./editor-config";

export interface IncomeActionInput {
  mode: EditorMode;
  id: string;
  period: string;
  name: string;
  description: string;
  amount: string;
  note: string;
}

/** Convert the editor draft without changing or submitting it. */
export function buildIncomeAction({
  mode,
  id,
  period,
  name,
  description,
  amount,
  note,
}: IncomeActionInput): IncomeAction {
  switch (mode.type) {
    case "create":
      return {
        type: "createCategory",
        id: id,
        start: period,
        name,
        description,
      };
    case "configure":
      return {
        type: "configureCategory",
        categoryId: mode.category.id,
        month: period,
        name,
        description,
      };
    case "stop":
      return {
        type: "stopCategory",
        categoryId: mode.category.id,
        month: period,
      };
    case "deleteCategory":
      return { type: "deleteCategory", categoryId: mode.category.id };
    case "monthly":
      return {
        type: "setMonthly",
        categoryId: mode.row.categoryId!,
        month: period,
        amount: normalizeInteger(amount),
        note,
      };
    case "clear":
      return {
        type: "clearMonthly",
        categoryId: mode.row.categoryId!,
        month: mode.row.month,
      };
    case "oneoff":
      return {
        type: "upsertOneOff",
        id: mode.row?.key ?? id,
        month: period,
        name,
        description,
        amount: normalizeInteger(amount),
      };
    case "deleteOneOff":
      return { type: "deleteOneOff", id: mode.row.key };
  }
}
