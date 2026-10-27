import { changedRecords } from "./changed-records";
import postgres from "postgres";
import type {
  IncomeBook,
  IncomeCategory,
  MonthlyIncome,
  OneOffIncome,
} from "../domain/income/types";
import type {
  IncomeRepository,
  IncomeTransaction,
  StoredCommand,
} from "../application/income";
function adapter(
  db: Pick<postgres.Sql, "unsafe">,
  owner: string,
): IncomeTransaction {
  const query = <T extends postgres.Row>(
    sql: string,
    args: (string | number | boolean | null)[] = [],
  ) => db.unsafe<T[]>(sql, args);
  let baseline: IncomeBook | undefined;
  return {
    async read() {
      const [header] = await query<{ version: number }>(
        "select version from public.income_books where owner_id=$1",
        [owner],
      );
      if (!header) return null;
      const categories = await query<IncomeCategory>(
        "select id,start_month as start,deleted,rules from public.income_categories where owner_id=$1 order by start_month,id",
        [owner],
      );
      const monthly = await query<MonthlyIncome>(
        'select category_id as "categoryId",month,amount::text,note from public.income_monthly where owner_id=$1 order by month,category_id',
        [owner],
      );
      const oneOffs = await query<OneOffIncome>(
        "select id,month,name,description,amount::text,deleted from public.income_oneoffs where owner_id=$1 order by month,id",
        [owner],
      );
      const audit = await query<IncomeBook["audit"][number]>(
        `select version,to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as at,action,detail from public.income_audit where owner_id=$1 order by version`,
        [owner],
      );
      const book: IncomeBook = {
        ...header,
        categories: [...categories],
        monthly: [...monthly],
        oneOffs: [...oneOffs],
        audit: [...audit],
      };
      baseline = structuredClone(book);
      return book;
    },
    async command(id) {
      const [row] = await query<StoredCommand>(
        "select fingerprint,result from public.income_commands where owner_id=$1 and id=$2",
        [owner, id],
      );
      return row ?? null;
    },
    async save(book) {
      await query(
        "insert into public.income_books(owner_id,version) values($1,$2) on conflict(owner_id) do update set version=excluded.version",
        [owner, book.version],
      );
      for (const c of changedRecords(
        baseline?.categories,
        book.categories,
        (c) => c.id,
      ))
        await query(
          "insert into public.income_categories(owner_id,id,start_month,deleted,rules) values($1,$2,$3,$4,$5::text::jsonb) on conflict(owner_id,id) do update set deleted=excluded.deleted,rules=excluded.rules where (income_categories.deleted,income_categories.rules) is distinct from (excluded.deleted,excluded.rules)",
          [owner, c.id, c.start, c.deleted, JSON.stringify(c.rules)],
        );
      // Reconcile only cleared monthly inputs. Financial history remains in the immutable audit.
      const existing = await query<{ category_id: string; month: string }>(
        "select category_id,month from public.income_monthly where owner_id=$1",
        [owner],
      );
      for (const r of existing)
        if (
          !book.monthly.some(
            (m) => m.categoryId === r.category_id && m.month === r.month,
          )
        )
          await query(
            "delete from public.income_monthly where owner_id=$1 and category_id=$2 and month=$3",
            [owner, r.category_id, r.month],
          );
      for (const r of changedRecords(
        baseline?.monthly,
        book.monthly,
        (r) => `${r.categoryId}/${r.month}`,
      ))
        await query(
          "insert into public.income_monthly(owner_id,category_id,month,amount,note) values($1,$2,$3,$4,$5) on conflict(owner_id,category_id,month) do update set amount=excluded.amount,note=excluded.note where (income_monthly.amount,income_monthly.note) is distinct from (excluded.amount,excluded.note)",
          [owner, r.categoryId, r.month, r.amount, r.note],
        );
      for (const r of changedRecords(
        baseline?.oneOffs,
        book.oneOffs,
        (r) => r.id,
      ))
        await query(
          "insert into public.income_oneoffs(owner_id,id,month,name,description,amount,deleted) values($1,$2,$3,$4,$5,$6,$7) on conflict(owner_id,id) do update set month=excluded.month,name=excluded.name,description=excluded.description,amount=excluded.amount,deleted=excluded.deleted where (income_oneoffs.month,income_oneoffs.name,income_oneoffs.description,income_oneoffs.amount,income_oneoffs.deleted) is distinct from (excluded.month,excluded.name,excluded.description,excluded.amount,excluded.deleted)",
          [owner, r.id, r.month, r.name, r.description, r.amount, r.deleted],
        );
      const a = book.audit.at(-1)!;
      await query(
        "insert into public.income_audit(owner_id,version,at,action,detail) values($1,$2,$3,$4,$5::text::jsonb)",
        [owner, a.version, a.at, a.action, JSON.stringify(a.detail)],
      );
      baseline = structuredClone(book);
    },
    async remember(id, value) {
      await query(
        "insert into public.income_commands(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
        [owner, id, value.fingerprint, JSON.stringify(value.result)],
      );
    },
  };
}
export function postgresIncomeRepository(sql: postgres.Sql): IncomeRepository {
  return {
    async transaction<T>(
      owner: string,
      fn: (tx: IncomeTransaction) => Promise<T>,
    ): Promise<T> {
      if (!/^[0-9a-f-]{36}$/i.test(owner))
        throw new Error("Invalid authenticated owner");
      return (await sql.begin(async (tx) => {
        await tx.unsafe("set local role authenticated");
        await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
          JSON.stringify({ sub: owner, role: "authenticated" }),
        ]);
        await tx.unsafe(
          "select pg_advisory_xact_lock(hashtextextended($1,0))",
          [`income:${owner}`],
        );
        return fn(adapter(tx, owner));
      })) as T;
    },
  };
}
