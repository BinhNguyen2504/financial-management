import { describe, expect, it } from "vitest";
import { backupTables } from "../src/domain/backup/format";
import { restoreBlockers, restoreReasons } from "../src/domain/backup/status";

describe("restore diagnosis", () => {
  it("accounts for every financial table exactly once, including zero-value records and history", () => {
    for (const table of backupTables) {
      const modules = restoreBlockers({ [table]: 1 });
      expect(modules).toHaveLength(6);
      const blocked = modules.filter((module) => module.count > 0);
      expect(blocked, table).toHaveLength(1);
      expect(blocked[0].details).toEqual([
        { table, label: expect.any(String), count: 1 },
      ]);
    }
    expect(restoreBlockers({}).every((module) => module.count === 0)).toBe(
      true,
    );
  });
  it("reports simultaneous account and infrastructure blockers independently", () => {
    expect(restoreReasons(false, false)).toEqual([
      "ACCOUNT_NOT_EMPTY",
      "IMPORT_NOT_READY",
    ]);
    expect(restoreReasons(true, true)).toEqual([]);
  });
});
