import { setTransactionOwner } from "./owner-transaction";
import type postgres from "postgres";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  backupTables,
  tableSchemas,
  primaryColumns,
  BackupError,
  summarizeBackup,
  type BackupTable,
  type BackupTables,
  type FullBackup,
} from "../domain/backup/format";
import { canonical, validateBackup } from "../domain/backup/validate";

type DB = Pick<postgres.Sql, "unsafe">;
const numericColumns = new Set([
  "opening",
  "target",
  "funding",
  "extra",
  "closing",
  "amount",
]);
export function backupMaxBytes() {
  const raw = process.env.DATA_BACKUP_MAX_BYTES;
  if (!raw) return 20 * 1024 * 1024;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1024)
    throw new BackupError(
      "Cấu hình giới hạn backup không hợp lệ.",
      503,
      "NOT_CONFIGURED",
    );
  return n;
}
export function checkBackupSize(backup: FullBackup) {
  const body = JSON.stringify(backup);
  if (Buffer.byteLength(body) > backupMaxBytes())
    throw new BackupError(
      "Bản sao lưu vượt giới hạn dung lượng của môi trường hiện tại. Cần tăng giới hạn trước khi xuất hoặc nhập.",
      413,
      "BACKUP_TOO_LARGE",
    );
  return body;
}
async function schemaReady(db: DB) {
  const names = [...backupTables];
  const rows = await db.unsafe<{ name: string; present: boolean }[]>(
    "select name,to_regclass('public.'||name) is not null as present from unnest($1::text[]) as name",
    [names],
  );
  if (rows.some((r) => !r.present))
    throw new BackupError(
      "Một phần dữ liệu chưa sẵn sàng. Chưa thể tạo bản sao lưu đầy đủ; hãy kiểm tra lại thiết lập hệ thống.",
      503,
      "SCHEMA_NOT_READY",
    );
}
async function importReady(db: DB): Promise<boolean> {
  const [row] = await db.unsafe<{ ready: boolean }[]>(
    "select to_regclass('public.data_imports') is not null as ready",
  );
  return row.ready;
}
async function counts(db: DB, owner: string) {
  const rows = await db.unsafe<{ name: BackupTable; count: number }[]>(
    backupTables
      .map(
        (t) =>
          `select '${t}' as name,count(*)::integer as count from public.${t} where owner_id=$1`,
      )
      .join(" union all "),
    [owner],
  );
  return Object.fromEntries(rows.map((r) => [r.name, r.count]));
}
async function readTables(db: DB, owner: string): Promise<BackupTables> {
  const result: Partial<Record<BackupTable, unknown>> = {};
  for (const table of backupTables) {
    const columns = Object.keys(tableSchemas[table].shape);
    const projection = columns
      .map((c) => {
        if (numericColumns.has(c)) return `${c}::text as ${c}`;
        if (c === "date") return "to_char(date,'YYYY-MM-DD') as date";
        if (c === "at" || c === "closed_at")
          return `to_char(${c} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as ${c}`;
        return c;
      })
      .join(",");
    const order = primaryColumns(table);
    result[table] = [
      ...(await db.unsafe(
        `select ${projection} from public.${table} where owner_id=$1${order.length ? ` order by ${order.join(",")}` : ""}`,
        [owner],
      )),
    ];
  }
  return result as BackupTables;
}
function orderedTables(tables: BackupTables) {
  return Object.fromEntries(
    backupTables.map((table) => {
      const keys = primaryColumns(table);
      const rows = tables[table] as unknown as Record<string, unknown>[];
      return [
        table,
        [...rows].sort((a, b) =>
          canonical(keys.map((k) => a[k])).localeCompare(
            canonical(keys.map((k) => b[k])),
          ),
        ),
      ];
    }),
  );
}
export function postgresDataRepository(sql: postgres.Sql) {
  async function transaction<T>(
    owner: string,
    fn: (db: DB) => Promise<T>,
    snapshot = false,
  ): Promise<T> {
    z.uuid().parse(owner);
    return (await sql.begin(
      snapshot ? "isolation level repeatable read read only" : "",
      async (tx) => {
        await setTransactionOwner(tx, owner);
        await schemaReady(tx);
        return fn(tx);
      },
    )) as T;
  }
  return {
    async status(owner: string) {
      return transaction(
        owner,
        async (db) => {
          const c = await counts(db, owner);
          return {
            empty: Object.values(c).every((n) => n === 0),
            counts: c,
            maxBytes: backupMaxBytes(),
            ownerId: owner,
            importReady: await importReady(db),
          };
        },
        true,
      );
    },
    async backup(owner: string, profile: FullBackup["profile"]) {
      return transaction(
        owner,
        async (db) => {
          const backup = validateBackup({
            format: "financial-manager-full-backup",
            schemaVersion: 2,
            exportedAt: new Date().toISOString(),
            profile,
            tables: await readTables(db, owner),
          });
          checkBackupSize(backup);
          return backup;
        },
        true,
      );
    },
    async import(owner: string, requestId: string, input: unknown) {
      z.uuid().parse(requestId);
      const backup = validateBackup(input);
      checkBackupSize(backup);
      const fingerprint = createHash("sha256")
        .update(canonical(backup))
        .digest("hex");
      return transaction(owner, async (db) => {
        if (!(await importReady(db)))
          throw new BackupError(
            "Tính năng khôi phục chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu.",
            503,
            "IMPORT_NOT_READY",
          );
        // Same keys as normal writes, always in the same order.
        for (const key of [
          owner,
          `income:${owner}`,
          `savings:${owner}`,
          `investments:${owner}`,
          `funds:${owner}`,
        ])
          await db.unsafe(
            "select pg_advisory_xact_lock(hashtextextended($1,0))",
            [key],
          );
        const [receipt] = await db.unsafe<
          { fingerprint: string; result: ReturnType<typeof summarizeBackup> }[]
        >(
          "select fingerprint,result from public.data_imports where owner_id=$1 and id=$2",
          [owner, requestId],
        );
        if (receipt) {
          if (receipt.fingerprint !== fingerprint)
            throw new BackupError(
              "Mã yêu cầu đã được dùng với file khác.",
              409,
              "IDEMPOTENCY_CONFLICT",
            );
          return receipt.result;
        }
        if (Object.values(await counts(db, owner)).some((n) => n > 0))
          throw new BackupError(
            "Chỉ có thể nhập vào tài khoản chưa có dữ liệu tài chính.",
            409,
            "ACCOUNT_NOT_EMPTY",
          );
        for (const table of backupTables) {
          if (!backup.tables[table].length) continue;
          const columns = Object.keys(tableSchemas[table].shape);
          // PostgreSQL checks self-referencing FKs after the entire INSERT statement.
          // Only allowlisted columns are read; owner is exclusively server supplied.
          await db.unsafe(
            `insert into public.${table}(owner_id,${columns.join(",")}) select $1::uuid,${columns.map((c) => `r.${c}`).join(",")} from jsonb_populate_recordset(null::public.${table},$2::text::jsonb) r`,
            [owner, JSON.stringify(backup.tables[table])],
          );
        }
        const readBack = await readTables(db, owner);
        if (
          canonical(orderedTables(readBack)) !==
          canonical(orderedTables(backup.tables))
        )
          throw new BackupError(
            "Đối soát sau nhập không khớp. Toàn bộ lần nhập đã được hủy.",
            422,
            "RESTORE_MISMATCH",
          );
        const result = summarizeBackup(backup);
        await db.unsafe(
          "insert into public.data_imports(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
          [owner, requestId, fingerprint, JSON.stringify(result)],
        );
        return result;
      });
    },
  };
}
