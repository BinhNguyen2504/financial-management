import { describe, expect, it, vi } from "vitest";
import {
  buildExpenseAction,
  type ExpenseActionInput,
} from "../src/features/expenses/editor-action";
import { buildIncomeAction } from "../src/features/income/editor-action";
import { buildSavingsAction } from "../src/features/savings/editor-action";
import { buildInvestmentAction } from "../src/features/investments/editor-action";
import {
  buildFundAction,
  type FundActionInput,
} from "../src/features/funds/editor-action";
import { localDateTime } from "../src/features/funds/content";
import type { FundTransaction } from "../src/domain/funds/schema";

const id = "00000000-0000-4000-8000-000000000001";
const categoryId = "00000000-0000-4000-8000-000000000002";
const lotId = "00000000-0000-4000-8000-000000000003";
const large = "999999999999999999999999";

describe("editor draft to action compatibility", () => {
  it("preserves exact amounts and allocates IDs only for actions that create records", () => {
    const newId = vi.fn(() => id);
    const draft: ExpenseActionInput = {
      editor: { mode: "initialize" },
      name: "Jar",
      description: "",
      method: "Cash",
      group: "",
      amount: large,
      period: "2026-10",
      kind: "monthly",
      opening: "0",
      emoji: null,
      target: "",
      funding: "",
      extra: "0",
      closing: "",
      date: "2026-10-28",
      note: "",
      labelKind: "method",
      brandKey: "",
      iconKey: "",
      newId,
    };
    expect(buildExpenseAction(draft)).toEqual({
      type: "initialize",
      start: "2026-10",
    });
    expect(newId).not.toHaveBeenCalled();
    expect(
      buildExpenseAction({ ...draft, editor: { mode: "create" } }),
    ).toMatchObject({ type: "createJar", id, amount: large });
    expect(newId).toHaveBeenCalledOnce();
    expect(
      buildIncomeAction({
        mode: { type: "oneoff" },
        id,
        period: "2026-10",
        name: "Income",
        description: "",
        amount: `00${large}`,
        note: "",
      }),
    ).toEqual({
      type: "upsertOneOff",
      id,
      month: "2026-10",
      name: "Income",
      description: "",
      amount: large,
    });
  });

  it("keeps gold lot quantities as decimal strings and omits zero allocations without mutating the draft", () => {
    const allocations = Object.freeze({
      [lotId]: "0.000001",
      [id]: "0",
      [categoryId]: "",
    });
    const fields = Object.freeze({
      date: "2026-10-28",
      categoryId,
      note: "",
      cashCategoryId: "",
      fee: "0000",
      tax: "0",
      name: "",
      maturity: "",
      term: "",
      unitPrice: large,
    });
    const result = buildSavingsAction({
      mode: { type: "transaction" },
      transactionId: id,
      entityId: lotId,
      txKind: "sellGold",
      fields,
      allocations,
      old: undefined,
    });
    expect(result).toEqual({
      type: "postTransaction",
      transaction: {
        id,
        kind: "sellGold",
        date: "2026-10-28",
        categoryId,
        note: "",
        cashCategoryId: null,
        fee: "0",
        tax: "0",
        unitPrice: large,
        allocations: [{ lotId, quantity: "0.000001" }],
      },
    });
    expect(allocations[id]).toBe("0");
  });

  it("retains investment correction identity, fees and the external-money null wallet", () => {
    const fields = Object.freeze({
      date: "2026-10-28",
      categoryId,
      note: "",
      counterparty: "",
      amount: large,
      fee: "0001",
      tax: "0",
      value: large,
      cashCategoryId: "",
      reason: "Correction",
    });
    const old = {
      id,
      kind: "buy" as const,
      date: "2026-10-27",
      categoryId,
      note: "",
      counterparty: "",
      amount: "1",
      fee: "0",
      tax: "0",
      value: "1",
      cashCategoryId: null,
    };
    expect(
      buildInvestmentAction({
        mode: { type: "revise", transaction: old },
        entityId: lotId,
        originalId: id,
        kind: "buy",
        fields,
        old,
      }),
    ).toEqual({
      type: "reviseTransaction",
      transactionId: id,
      reason: "Correction",
      replacement: {
        id,
        kind: "buy",
        date: "2026-10-28",
        categoryId,
        note: "",
        counterparty: "",
        amount: large,
        fee: "1",
        tax: "0",
        value: large,
        cashCategoryId: null,
      },
    });
  });

  it("keeps Fund timestamps with seconds when the displayed minute was unchanged", () => {
    const old: FundTransaction = {
      id,
      kind: "deposit",
      fundId: "emergency",
      locationId: categoryId,
      amount: "1",
      occurredAt: "2026-10-27T15:12:34.567Z",
      note: "",
    };
    const input: FundActionInput = {
      mode: { type: "revise", transaction: old },
      entity: id,
      old,
      jarIds: [],
      multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
      priority: ["emergency", "rainy_day", "sinking"],
      applyLiving: false,
      view: { source: { month: "2026-10", expenseVersion: 7, items: [] } },
      fields: {
        name: "",
        active: true,
        kind: "deposit",
        fundId: "emergency",
        locationId: categoryId,
        toFundId: "emergency",
        toLocationId: "",
        amount: large,
        occurredAt: localDateTime(old.occurredAt),
        note: "",
        reason: "Correction",
      },
      tr: (message) => message,
    };
    expect(buildFundAction(input)).toMatchObject({
      type: "reviseTransaction",
      transactionId: id,
      replacement: { occurredAt: old.occurredAt, amount: large },
    });
    expect(() =>
      buildFundAction({
        ...input,
        fields: { ...input.fields, occurredAt: "invalid" },
      }),
    ).toThrow("Nhập thời điểm giao dịch hợp lệ.");
  });
});
