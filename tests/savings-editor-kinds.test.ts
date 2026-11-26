import { describe, expect, it } from "vitest";
import { transactionSchema } from "../src/domain/savings/schema";
import {
  assetOfTransaction,
  defaultTransactionKinds,
  transactionHints,
  transactionKindsByAsset,
} from "../src/features/savings/editor-config";
import { savings } from "../src/i18n/messages/savings";

const schemaKinds = transactionSchema.options.map(
  (option) => option.shape.kind.value,
);

describe("Savings transaction types follow the chosen category", () => {
  it("offers every transaction type under exactly one asset type", () => {
    const offered = Object.values(transactionKindsByAsset).flat();
    expect([...offered].sort()).toEqual([...schemaKinds].sort());
  });

  it("maps each type and default back to its asset type", () => {
    for (const asset of ["cash", "deposit", "gold"] as const) {
      expect(transactionKindsByAsset[asset]).toContain(
        defaultTransactionKinds[asset],
      );
      for (const kind of transactionKindsByAsset[asset])
        expect(assetOfTransaction(kind)).toBe(asset);
    }
  });

  it("explains every transaction type in both languages", () => {
    const english: Record<string, string> = savings;
    for (const kind of schemaKinds)
      expect(english[transactionHints[kind]], kind).toBeTruthy();
  });
});
