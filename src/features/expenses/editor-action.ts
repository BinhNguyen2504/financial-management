import type { JarEmoji } from "@/domain/expenses/emoji";

import type { ExpenseAction } from "@/domain/expenses/schema";

import { normalizeInteger } from "@/lib/form-values";

import { type EditorMode } from "./editor-config";

export interface ExpenseActionInput {
  name: string;
  description: string;
  method: string;
  group: string;
  amount: string;
  editor: EditorMode;
  period: string;
  kind: "monthly" | "accumulation";
  opening: string;
  emoji: JarEmoji | null;
  target: string;
  funding: string;
  extra: string;
  closing: string;
  date: string;
  note: string;
  labelKind: "method" | "group";
  brandKey: string;
  iconKey: string;
  newId: () => string;
}

/** Convert the editor draft without changing or submitting it. */
export function buildExpenseAction({
  name,
  description,
  method,
  group,
  amount,
  editor,
  period,
  kind,
  opening,
  emoji,
  target,
  funding,
  extra,
  closing,
  date,
  note,
  labelKind,
  brandKey,
  iconKey,
  newId,
}: ExpenseActionInput): ExpenseAction {
  const config = {
    name,
    description,
    method,
    group,
    amount: normalizeInteger(amount),
  };
  switch (editor.mode) {
    case "initialize":
      return { type: "initialize", start: period };
    case "create":
      return {
        type: "createJar",
        id: newId(),
        kind,
        start: period,
        opening: normalizeInteger(opening),
        emoji,
        ...config,
      };
    case "emoji":
      return {
        type: "setJarEmoji",
        jarId: editor.row.jarId,
        month: period,
        emoji,
      };
    case "configure":
      return {
        type: "configureJar",
        jarId: editor.row.jarId,
        month: period,
        ...config,
      };
    case "stop":
      return { type: "stopJar", jarId: editor.row.jarId, month: period };
    case "month":
      return {
        type: "editMonth",
        jarId: editor.row.jarId,
        month: editor.row.month,
        target: normalizeInteger(target) || null,
        funding: normalizeInteger(funding) || null,
        extra: normalizeInteger(extra),
        closing:
          editor.row.kind === "monthly"
            ? normalizeInteger(closing) || null
            : null,
      };
    case "spend":
      return {
        type: "upsertSpend",
        id: editor.spend?.id ?? newId(),
        jarId: editor.row.jarId,
        date,
        amount: normalizeInteger(amount),
        note,
      };
    case "deleteSpend":
      return { type: "deleteSpend", id: editor.spend.id };
    case "label":
      return {
        type: "upsertLabel",
        id: editor.label?.id ?? newId(),
        kind: labelKind,
        name,
        brandKey: labelKind === "method" ? brandKey || null : null,
        iconKey: (iconKey || null) as
          import("@/domain/expenses/label-visuals").LabelIconKey | null,
      };
    case "deleteLabel":
      return { type: "deleteLabel", id: editor.label.id };
    case "closeYear":
      return { type: "closeYear", year: editor.year };
  }
}
