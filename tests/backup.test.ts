import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  backupTables,
  parseBackup,
  summarizeBackup,
  type FullBackup,
} from "../src/domain/backup/format";
import { validateBackup, canonical } from "../src/domain/backup/validate";
import { backupMaxBytes, checkBackupSize } from "../src/server/data-repository";

function empty(): FullBackup {
  return parseBackup({
    format: "financial-manager-full-backup",
    schemaVersion: 2,
    exportedAt: "2026-10-18T00:00:00.000Z",
    profile: { full_name: "", birth_date: "", gender: "" },
    tables: Object.fromEntries(backupTables.map((t) => [t, []])),
  });
}
describe("portable full backup validation", () => {
  it("requires all 35 allowlisted tables and accepts an empty account without initializing it", () => {
    expect(backupTables).toHaveLength(35);
    expect(validateBackup(empty())).toEqual(empty());
    expect(summarizeBackup(empty()).from).toBeNull();
    const wrong = structuredClone(empty()) as unknown as {
      tables: Record<string, unknown>;
    };
    delete wrong.tables.investments_books;
    expect(() => validateBackup(wrong)).toThrow();
    wrong.tables.arbitrary_sql = [];
    expect(() => validateBackup(wrong)).toThrow();
  });
  it("rejects module exports, future formats, injected owner columns, bad dates and broken foreign keys", () => {
    expect(() =>
      validateBackup({ format: "financial-manager-savings", schemaVersion: 1 }),
    ).toThrow();
    expect(() => validateBackup({ ...empty(), schemaVersion: 3 })).toThrow();
    const b = empty();
    b.tables.income_books.push({ version: 1 });
    b.tables.income_audit.push({
      version: 1,
      at: b.exportedAt,
      action: "seedReviewData",
      detail: {},
    });
    b.tables.income_monthly.push({
      category_id: randomUUID(),
      month: "2026-10",
      amount: "900719925474099312345",
      note: "",
    });
    expect(() => validateBackup(b)).toThrow(/danh mục/);
    expect(() =>
      parseBackup({
        ...empty(),
        profile: { full_name: "A", birth_date: "2020-02-31", gender: "" },
      }),
    ).toThrow();
    const injected = empty();
    injected.tables.income_books = [
      { version: 1, owner_id: randomUUID() } as { version: number },
    ];
    expect(() => validateBackup(injected)).toThrow();
  });
  it("preserves exact money strings and rejects numeric or duplicated money rows", () => {
    const b = empty();
    b.tables.income_books.push({ version: 1 });
    b.tables.income_audit.push({
      version: 1,
      at: b.exportedAt,
      action: "seedReviewData",
      detail: {},
    });
    b.tables.income_oneoffs.push({
      id: randomUUID(),
      month: "2026-10",
      name: "Thu lớn",
      description: "",
      deleted: false,
      amount: "999999999999999999999999",
    });
    expect(validateBackup(b).tables.income_oneoffs[0].amount).toBe(
      "999999999999999999999999",
    );
    b.tables.income_oneoffs.push(b.tables.income_oneoffs[0]);
    expect(() => validateBackup(b)).toThrow(/trùng/);
    b.tables.income_oneoffs.pop();
    (b.tables.income_oneoffs[0] as unknown as { amount: number }).amount = 100;
    expect(() => validateBackup(b)).toThrow();
  });
  it("includes Fund business dates in the Vietnamese timezone in the preview period", () => {
    const b = empty();
    b.tables.funds_transactions.push({
      data: { transaction: { occurredAt: "2026-10-18T23:30:00Z" } },
    } as unknown as FullBackup["tables"]["funds_transactions"][number]);
    expect(summarizeBackup(b)).toMatchObject({
      from: "2026-10-19",
      to: "2026-10-19",
    });
  });
  it("uses canonical object fingerprints and one shared size limit", () => {
    expect(canonical({ b: 2, a: 1 })).toBe(canonical({ a: 1, b: 2 }));
    const previous = process.env.DATA_BACKUP_MAX_BYTES;
    try {
      delete process.env.DATA_BACKUP_MAX_BYTES;
      expect(backupMaxBytes()).toBe(20 * 1024 * 1024);
      process.env.DATA_BACKUP_MAX_BYTES = "1024";
      const b = empty();
      b.profile.full_name = "x".repeat(1000);
      expect(() => checkBackupSize(b)).toThrow(/dung lượng/);
      process.env.DATA_BACKUP_MAX_BYTES = "NaN";
      expect(() => backupMaxBytes()).toThrow();
    } finally {
      if (previous === undefined) delete process.env.DATA_BACKUP_MAX_BYTES;
      else process.env.DATA_BACKUP_MAX_BYTES = previous;
    }
  });
});
