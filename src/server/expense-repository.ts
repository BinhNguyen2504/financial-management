import { withOwnerTransaction, lockOwner } from "./owner-transaction";
import { changedRecords } from "./changed-records";
import type postgres from "postgres";
import { ExpenseError } from "../domain/expenses/engine";
import type {
  ExpenseBook,
  Jar,
  MonthInput,
  Spend,
  ExpenseYear,
  Label,
  Audit,
} from "../domain/expenses/types";
import type {
  ExpenseRepository,
  ExpenseTransaction,
  StoredCommand,
} from "../application/expenses";

type DB = Pick<postgres.Sql, "unsafe">;
type Params = (string | number | boolean | null)[];
const json = (value: unknown) => JSON.stringify(value);
export function transactionAdapter(db: DB, owner: string): ExpenseTransaction {
  const query = <T extends postgres.Row>(sql: string, params: Params = []) =>
    db.unsafe<T[]>(sql, params);
  let baseline: ExpenseBook | undefined;
  return {
    async read() {
      const [header] = await query<{ start: string; version: number }>(
        "select start_month as start, version from public.expense_books where owner_id=$1",
        [owner],
      );
      if (!header) return null;
      const jars = await query<Jar>(
        "select id,kind,start_month as start,opening::text,rules from public.expense_jars where owner_id=$1 order by start_month,id",
        [owner],
      );
      const inputs = await query<MonthInput>(
        'select jar_id as "jarId",month,target::text,funding::text,extra::text,closing::text from public.expense_month_inputs where owner_id=$1',
        [owner],
      );
      const spends = await query<Spend>(
        "select id,jar_id as \"jarId\",to_char(date,'YYYY-MM-DD') as date,amount::text,note,deleted from public.expense_spends where owner_id=$1 order by date,id",
        [owner],
      );
      const years = await query<ExpenseYear>(
        'select year,case when closed_at is null then null else to_char(closed_at at time zone \'UTC\',\'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') end as "closedAt",snapshot from public.expense_years where owner_id=$1 order by year',
        [owner],
      );
      const labels = await query<Label>(
        // Optional presentation columns may not have been migrated yet.
        `select id,kind,name,to_jsonb(l)->>'brand_key' as "brandKey",to_jsonb(l)->>'icon_key' as "iconKey" from public.expense_labels l where owner_id=$1 order by kind,name`,
        [owner],
      );
      const audit = await query<Audit>(
        "select version,to_char(at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as at,action,detail from public.expense_audit where owner_id=$1 order by version",
        [owner],
      );
      const book: ExpenseBook = {
        ...header,
        jars: [...jars],
        inputs: [...inputs],
        spends: [...spends],
        years: [...years],
        labels: [...labels],
        audit: [...audit],
      };
      baseline = structuredClone(book);
      return book;
    },
    async command(id) {
      const [row] = await query<{
        fingerprint: string;
        result: StoredCommand["result"];
      }>(
        "select fingerprint,result from public.expense_commands where owner_id=$1 and id=$2",
        [owner, id],
      );
      return row ?? null;
    },
    async save(book) {
      let hasLabelVisuals = false;
      const changedLabels = changedRecords(
        baseline?.labels,
        book.labels,
        (l) => l.id,
      );
      if (changedLabels.length) {
        const [schema] = await query<{ ready: boolean }>(
          `select count(*) = 2 as ready from information_schema.columns
          where table_schema='public' and table_name='expense_labels'
          and column_name in ('brand_key','icon_key')`,
        );
        hasLabelVisuals = schema.ready;
        if (
          !hasLabelVisuals &&
          changedLabels.some(
            (label) => label.brandKey != null || label.iconKey != null,
          )
        )
          throw new ExpenseError(
            "Cần áp dụng migration 202610190002_label_visuals.sql để lưu logo hoặc biểu tượng phân loại. Dữ liệu chưa được lưu; nội dung đang nhập vẫn được giữ.",
            503,
            "LABEL_VISUALS_MIGRATION_REQUIRED",
          );
      }
      await query(
        `insert into public.expense_books(owner_id,start_month,version) values($1,$2,$3)
        on conflict(owner_id) do update set version=excluded.version`,
        [owner, book.start, book.version],
      );
      for (const jar of changedRecords(
        baseline?.jars,
        book.jars,
        (jar) => jar.id,
      ))
        await query(
          `insert into public.expense_jars(owner_id,id,kind,start_month,opening,rules) values($1,$2,$3,$4,$5,$6::text::jsonb)
        on conflict(owner_id,id) do update set rules=excluded.rules where expense_jars.rules is distinct from excluded.rules`,
          [owner, jar.id, jar.kind, jar.start, jar.opening, json(jar.rules)],
        );
      for (const i of changedRecords(
        baseline?.inputs,
        book.inputs,
        (i) => `${i.jarId}/${i.month}`,
      ))
        await query(
          `insert into public.expense_month_inputs(owner_id,jar_id,month,target,funding,extra,closing) values($1,$2,$3,$4,$5,$6,$7)
        on conflict(owner_id,jar_id,month) do update set target=excluded.target,funding=excluded.funding,extra=excluded.extra,closing=excluded.closing
        where (expense_month_inputs.target,expense_month_inputs.funding,expense_month_inputs.extra,expense_month_inputs.closing) is distinct from (excluded.target,excluded.funding,excluded.extra,excluded.closing)`,
          [owner, i.jarId, i.month, i.target, i.funding, i.extra, i.closing],
        );
      for (const s of changedRecords(
        baseline?.spends,
        book.spends,
        (s) => s.id,
      ))
        await query(
          `insert into public.expense_spends(owner_id,id,jar_id,date,amount,note,deleted) values($1,$2,$3,$4,$5,$6,$7)
        on conflict(owner_id,id) do update set date=excluded.date,amount=excluded.amount,note=excluded.note,deleted=excluded.deleted
        where (expense_spends.date,expense_spends.amount,expense_spends.note,expense_spends.deleted) is distinct from (excluded.date,excluded.amount,excluded.note,excluded.deleted)`,
          [owner, s.id, s.jarId, s.date, s.amount, s.note, s.deleted],
        );
      // Insert or seal a year, but never UPDATE a sealed snapshot, even with equal data.
      for (const y of changedRecords(
        baseline?.years,
        book.years,
        (y) => y.year,
      ))
        await query(
          `insert into public.expense_years(owner_id,year,closed_at,snapshot) values($1,$2,$3,$4::text::jsonb)
        on conflict(owner_id,year) do update set closed_at=excluded.closed_at,snapshot=excluded.snapshot
        where expense_years.closed_at is null and excluded.closed_at is not null`,
          [
            owner,
            y.year,
            y.closedAt,
            y.snapshot === null ? null : json(y.snapshot),
          ],
        );
      if (
        baseline?.labels.some(
          (old) => !book.labels.some((label) => label.id === old.id),
        )
      )
        await query(
          "delete from public.expense_labels where owner_id=$1 and not (id=any($2::uuid[]))",
          [owner, `{${book.labels.map((l) => l.id).join(",")}}`],
        );
      for (const l of changedLabels) {
        if (hasLabelVisuals)
          await query(
            `insert into public.expense_labels(owner_id,id,kind,name,brand_key,icon_key) values($1,$2,$3,$4,$5,$6)
        on conflict(owner_id,id) do update set name=excluded.name,brand_key=excluded.brand_key,icon_key=excluded.icon_key where (expense_labels.name,expense_labels.brand_key,expense_labels.icon_key) is distinct from (excluded.name,excluded.brand_key,excluded.icon_key)`,
            [
              owner,
              l.id,
              l.kind,
              l.name,
              l.brandKey ?? null,
              l.iconKey ?? null,
            ],
          );
        else
          await query(
            `insert into public.expense_labels(owner_id,id,kind,name) values($1,$2,$3,$4)
          on conflict(owner_id,id) do update set name=excluded.name where expense_labels.name is distinct from excluded.name`,
            [owner, l.id, l.kind, l.name],
          );
      }
      for (const a of changedRecords(
        baseline?.audit,
        book.audit,
        (a) => a.version,
      ))
        await query(
          `insert into public.expense_audit(owner_id,version,at,action,detail) values($1,$2,$3,$4,$5::text::jsonb) on conflict do nothing`,
          [owner, a.version, a.at, a.action, json(a.detail)],
        );
      baseline = structuredClone(book);
    },
    async remember(id, value) {
      await query(
        "insert into public.expense_commands(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
        [owner, id, value.fingerprint, json(value.result)],
      );
    },
  };
}

export function postgresExpenseRepository(
  sql: postgres.Sql,
): ExpenseRepository {
  return {
    async transaction<T>(
      owner: string,
      fn: (tx: ExpenseTransaction) => Promise<T>,
    ): Promise<T> {
      if (!/^[0-9a-f-]{36}$/i.test(owner))
        throw new Error("Invalid authenticated owner");
      const result = await withOwnerTransaction(sql, owner, async (tx) => {
        // Serialize all commands for one owner, including first initialization and retries.
        await lockOwner(tx, [owner]);
        return fn(transactionAdapter(tx, owner));
      });
      return result as T;
    },
  };
}
