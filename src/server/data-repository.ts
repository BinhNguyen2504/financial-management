import { setTransactionOwner, lockOwner } from "./owner-transaction";
import { dataGeneration, withDataGeneration } from "./data-generation";
import { restoreBlockers, restoreReasons } from "../domain/backup/status";
import type postgres from "postgres";
import { createHash, randomUUID } from "node:crypto";
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
const labelVisualColumns = ["brand_key", "icon_key"] as const;
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
async function resetReady(db: DB) {
  const [row] = await db.unsafe<{ ready: boolean }[]>(
    "select to_regprocedure('public.reset_financial_data(uuid,uuid)') is not null and to_regclass('public.data_resets') is not null and to_regclass('public.data_generations') is not null as ready",
  );
  return row.ready;
}
const ownerLocks = (owner: string) => [
  owner,
  `income:${owner}`,
  `savings:${owner}`,
  `investments:${owner}`,
  `funds:${owner}`,
  `goals:${owner}`,
];
function makeBackup(tables: BackupTables, profile: FullBackup["profile"]) {
  const backup = validateBackup({
    format: "financial-manager-full-backup",
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    profile,
    tables,
  });
  checkBackupSize(backup);
  return backup;
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
        // These nullable presentation fields are absent on pre-visual schemas.
        if (
          table === "expense_labels" &&
          labelVisualColumns.some((v) => v === c)
        )
          return `to_jsonb(expense_labels)->>'${c}' as ${c}`;
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
          const empty = Object.values(c).every((n) => n === 0);
          const ready = await importReady(db);
          return {
            empty,
            counts: c,
            maxBytes: backupMaxBytes(),
            ownerId: owner,
            importReady: ready,
            resetReady: await resetReady(db),
            dataGeneration: await dataGeneration(db, owner),
            blockers: restoreBlockers(c),
            reasons: restoreReasons(empty, ready),
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
            schemaVersion: 3,
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
    async prepareReset(owner: string, profile: FullBackup["profile"]) {
      return transaction(owner, async (db) => {
        if (!(await resetReady(db)))
          throw new BackupError(
            "Làm trống dữ liệu chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu.",
            503,
            "RESET_NOT_READY",
          );
        await lockOwner(db, ownerLocks(owner));
        const backup = makeBackup(await readTables(db, owner), profile);
        const operationId = randomUUID();
        const generation = await dataGeneration(db, owner);
        const [operation] = await db.unsafe<{ expires_at: string }[]>(
          "insert into public.data_resets(owner_id,id,generation,fingerprint) values($1,$2,$3,public.financial_data_fingerprint()) returning expires_at::text",
          [owner, operationId, generation],
        );
        return {
          backup,
          operationId,
          expiresAt: operation.expires_at,
          dataGeneration: generation,
        };
      });
    },
    async reset(owner: string, operationId: string, requestId: string) {
      z.uuid().parse(operationId);
      z.uuid().parse(requestId);
      return transaction(owner, async (db) => {
        if (!(await resetReady(db)))
          throw new BackupError(
            "Làm trống dữ liệu chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu.",
            503,
            "RESET_NOT_READY",
          );
        try {
          const [row] = await db.unsafe<
            {
              result: {
                empty: boolean;
                dataGeneration: number;
                operationId: string;
              };
            }[]
          >("select public.reset_financial_data($1,$2) as result", [
            operationId,
            requestId,
          ]);
          return row.result;
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "42501"
          )
            throw new BackupError(
              "Chưa thể làm trống vì hệ thống chưa cấp đủ quyền xử lý. Dữ liệu chưa bị xóa; hãy tải lại trang sau khi hệ thống được cập nhật.",
              503,
              "RESET_PERMISSION_REQUIRED",
            );
          const code = error instanceof Error ? error.message : "";
          const messages: Record<string, string> = {
            RESET_NOT_FOUND:
              "Không tìm thấy bước sao lưu của tài khoản này. Hãy tạo bản sao lưu mới.",
            RESET_EXPIRED:
              "Bước xác nhận đã hết hạn. Hãy tạo bản sao lưu mới trước khi làm trống.",
            RESET_DATA_CHANGED:
              "Dữ liệu đã thay đổi từ lúc sao lưu. Hãy tạo bản sao lưu mới trước khi làm trống.",
            IDEMPOTENCY_CONFLICT:
              "Mã xác nhận đã được dùng. Hãy kiểm tra lại trạng thái dữ liệu.",
            RESET_MISMATCH:
              "Chưa làm trống được dữ liệu. Toàn bộ thao tác đã được hủy.",
          };
          if (messages[code]) throw new BackupError(messages[code], 409, code);
          throw error;
        }
      });
    },
    async import(
      owner: string,
      requestId: string,
      input: unknown,
      expectedGeneration = 0,
    ) {
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
        await lockOwner(db, ownerLocks(owner));
        await withDataGeneration(
          db,
          owner,
          expectedGeneration,
          async () => undefined,
        );
        const [receipt] = await db.unsafe<
          { fingerprint: string; result: ReturnType<typeof summarizeBackup> }[]
        >(
          "select fingerprint,result,to_jsonb(data_imports)->>'generation' as generation from public.data_imports where owner_id=$1 and id=$2",
          [owner, requestId],
        );
        if (receipt) {
          if (
            Number((receipt as { generation?: string }).generation ?? 0) !==
            expectedGeneration
          )
            throw new BackupError(
              "Lần khôi phục này thuộc dữ liệu trước khi làm trống. Hãy chọn lại bản sao lưu.",
              409,
              "DATA_GENERATION_CHANGED",
            );
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
        const labelColumns = await db.unsafe<{ column_name: string }[]>(
          `select column_name from information_schema.columns
          where table_schema='public' and table_name='expense_labels'
          and column_name in ('brand_key','icon_key')`,
        );
        const missingVisuals = labelVisualColumns.filter(
          (column) => !labelColumns.some((row) => row.column_name === column),
        );
        if (
          backup.tables.expense_labels.some((label) =>
            missingVisuals.some((column) => label[column] != null),
          )
        )
          throw new BackupError(
            "Một phần dữ liệu chưa sẵn sàng. Chưa thể khôi phục đầy đủ logo hoặc biểu tượng phân loại; hãy kiểm tra lại thiết lập hệ thống.",
            503,
            "SCHEMA_NOT_READY",
          );
        for (const table of backupTables) {
          if (!backup.tables[table].length) continue;
          const columns = Object.keys(tableSchemas[table].shape).filter(
            (column) =>
              table !== "expense_labels" ||
              !missingVisuals.some((missing) => missing === column),
          );
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
        if (expectedGeneration > 0 || (await resetReady(db)))
          await db.unsafe(
            "insert into public.data_imports(owner_id,id,fingerprint,result,generation) values($1,$2,$3,$4::text::jsonb,$5)",
            [
              owner,
              requestId,
              fingerprint,
              JSON.stringify(result),
              expectedGeneration,
            ],
          );
        else
          await db.unsafe(
            "insert into public.data_imports(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
            [owner, requestId, fingerprint, JSON.stringify(result)],
          );
        return result;
      });
    },
  };
}
