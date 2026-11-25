import { describe, expect, it } from "vitest";
import { backupTables, moduleLabels } from "@/domain/backup/format";
import {
  addedResetModules,
  fullResetConfirmation,
  isFullReset,
  partialResetConfirmation,
  resetConfirmationFor,
  resetModules,
  resolveResetModules,
} from "@/domain/backup/reset-modules";

describe("reset scopes", () => {
  it("matches the module prefixes of the backup tables", () => {
    expect([...resetModules].sort()).toEqual(Object.keys(moduleLabels).sort());
    for (const table of backupTables)
      expect(
        resetModules.some((module) => table.startsWith(`${module}_`)),
      ).toBe(true);
  });

  it("adds Goals whenever a module they link to is selected", () => {
    for (const source of ["savings", "investments", "funds"] as const) {
      expect(resolveResetModules([source])).toEqual([source, "goals"]);
      expect(addedResetModules([source])).toEqual(["goals"]);
    }
    expect(addedResetModules(["savings", "goals"])).toEqual([]);
  });

  it("leaves independent modules alone and keeps the canonical order", () => {
    expect(resolveResetModules(["income"])).toEqual(["income"]);
    expect(resolveResetModules(["expense"])).toEqual(["expense"]);
    expect(resolveResetModules(["goals"])).toEqual(["goals"]);
    expect(resolveResetModules(["funds", "expense", "expense"])).toEqual([
      "expense",
      "funds",
      "goals",
    ]);
  });

  it("requires the whole-account phrase only when every module is cleared", () => {
    expect(isFullReset(resolveResetModules([...resetModules]))).toBe(true);
    expect(isFullReset(resolveResetModules(["income"]))).toBe(false);
    expect(resetConfirmationFor([...resetModules])).toBe(fullResetConfirmation);
    expect(resetConfirmationFor(["income"])).toBe(partialResetConfirmation);
    expect(resetConfirmationFor(resolveResetModules(["savings"]))).toBe(
      partialResetConfirmation,
    );
    expect(fullResetConfirmation).not.toBe(partialResetConfirmation);
  });
});
