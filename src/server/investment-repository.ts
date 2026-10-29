import { withDataGeneration } from "./data-generation";
import { withOwnerTransaction, lockOwner } from "./owner-transaction";
import { changedRecords } from "./changed-records";
import type postgres from "postgres";
import type { InvestmentBook } from "../domain/investments/types";
import type {
  InvestmentRepository,
  InvestmentTransactionRepository,
  StoredCommand,
} from "../application/investments";
function adapter(
  db: Pick<postgres.Sql, "unsafe">,
  owner: string,
): InvestmentTransactionRepository {
  const query = <T extends postgres.Row>(
    sql: string,
    args: (string | number | null)[] = [],
  ) => db.unsafe<T[]>(sql, args);
  let baseline: InvestmentBook | undefined;
  return {
    async read() {
      const [head] = await query<{ version: number }>(
        "select version from public.investments_books where owner_id=$1",
        [owner],
      );
      if (!head) return null;
      async function data<T>(table: string, order: string): Promise<T[]> {
        const rows = await query<{ data: T }>(
          `select data from public.${table} where owner_id=$1 order by ${order}`,
          [owner],
        );
        return rows.map((r) => r.data);
      }
      const categories = await data<InvestmentBook["categories"][number]>(
        "investments_categories",
        "id",
      );
      const revisions = await data<InvestmentBook["revisions"][number]>(
        "investments_transactions",
        "sequence",
      );
      const valuations = await data<InvestmentBook["revisions"][number]>(
        "investments_valuations",
        "sequence",
      );
      const audit = await query<InvestmentBook["audit"][number]>(
        `select version,to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as at,action from public.investments_audit where owner_id=$1 order by version`,
        [owner],
      );
      const book: InvestmentBook = {
        ...head,
        categories,
        revisions: [...revisions, ...valuations].sort(
          (a, b) => a.sequence - b.sequence,
        ),
        audit: [...audit],
      };
      baseline = structuredClone(book);
      return book;
    },
    async command(id) {
      const [r] = await query<StoredCommand>(
        "select fingerprint,result from public.investments_commands where owner_id=$1 and id=$2",
        [owner, id],
      );
      return r ?? null;
    },
    async save(book) {
      await query(
        "insert into public.investments_books(owner_id,version) values($1,$2) on conflict(owner_id) do update set version=excluded.version",
        [owner, book.version],
      );
      for (const c of changedRecords(
        baseline?.categories,
        book.categories,
        (c) => c.id,
      ))
        await query(
          "insert into public.investments_categories(owner_id,id,data) values($1,$2,$3::text::jsonb) on conflict(owner_id,id) do update set data=excluded.data where investments_categories.data is distinct from excluded.data",
          [owner, c.id, JSON.stringify(c)],
        );
      for (const r of changedRecords(
        baseline?.revisions,
        book.revisions,
        (r) => r.id,
      )) {
        const t =
          r.transaction ??
          book.revisions.find((x) => x.rootId === r.rootId && x.transaction)!
            .transaction!;
        await query(
          `insert into public.${t.kind === "valuation" ? "investments_valuations" : "investments_transactions"}(owner_id,id,root_id,sequence,category_id,cash_category_id,data) values($1,$2,$3,$4,$5,$6,$7::text::jsonb) on conflict(owner_id,id) do nothing`,
          [
            owner,
            r.id,
            r.rootId,
            r.sequence,
            t.categoryId,
            "cashCategoryId" in t ? t.cashCategoryId : null,
            JSON.stringify(r),
          ],
        );
      }
      const a = book.audit.at(-1)!;
      await query(
        "insert into public.investments_audit(owner_id,version,at,action) values($1,$2,$3,$4::text::jsonb)",
        [owner, a.version, a.at, JSON.stringify(a.action)],
      );
      baseline = structuredClone(book);
    },
    async remember(id, value) {
      await query(
        "insert into public.investments_commands(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
        [owner, id, value.fingerprint, JSON.stringify(value.result)],
      );
    },
  };
}
export function postgresInvestmentRepository(
  sql: postgres.Sql,
  expectedGeneration?: number,
): InvestmentRepository {
  return {
    async transaction<T>(
      owner: string,
      fn: (tx: InvestmentTransactionRepository) => Promise<T>,
    ): Promise<T> {
      if (!/^[0-9a-f-]{36}$/i.test(owner))
        throw new Error("Invalid authenticated owner");
      return (await withOwnerTransaction(sql, owner, async (tx) => {
        await lockOwner(tx, [`investments:${owner}`]);
        return withDataGeneration(tx, owner, expectedGeneration, () =>
          fn(adapter(tx, owner)),
        );
      })) as T;
    },
  };
}
