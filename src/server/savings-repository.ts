import { withOwnerTransaction, lockOwner } from "./owner-transaction";
import { changedRecords } from "./changed-records";
import type postgres from "postgres";
import type { SavingsBook } from "../domain/savings/types";
import type {
  SavingsRepository,
  SavingsTransactionRepository,
  StoredCommand,
} from "../application/savings";
function adapter(
  db: Pick<postgres.Sql, "unsafe">,
  owner: string,
): SavingsTransactionRepository {
  const query = <T extends postgres.Row>(
    sql: string,
    args: (string | number | null)[] = [],
  ) => db.unsafe<T[]>(sql, args);
  let baseline: SavingsBook | undefined;
  return {
    async read() {
      const [head] = await query<{ version: number }>(
        "select version from public.savings_books where owner_id=$1",
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
      const categories = await data<SavingsBook["categories"][number]>(
        "savings_categories",
        "id",
      );
      const revisions = await data<SavingsBook["revisions"][number]>(
        "savings_transactions",
        "sequence",
      );
      const prices = await data<SavingsBook["prices"][number]>(
        "savings_prices",
        "sequence",
      );
      const closes = await data<SavingsBook["closes"][number]>(
        "savings_closes",
        "sequence",
      );
      const audit = await query<SavingsBook["audit"][number]>(
        `select version,to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as at,action from public.savings_audit where owner_id=$1 order by version`,
        [owner],
      );
      const book: SavingsBook = {
        ...head,
        categories,
        revisions,
        prices,
        closes,
        audit: [...audit],
      };
      baseline = structuredClone(book);
      return book;
    },
    async command(id) {
      const [r] = await query<StoredCommand>(
        "select fingerprint,result from public.savings_commands where owner_id=$1 and id=$2",
        [owner, id],
      );
      return r ?? null;
    },
    async save(book) {
      await query(
        "insert into public.savings_books(owner_id,version) values($1,$2) on conflict(owner_id) do update set version=excluded.version",
        [owner, book.version],
      );
      for (const c of changedRecords(
        baseline?.categories,
        book.categories,
        (c) => c.id,
      ))
        await query(
          "insert into public.savings_categories(owner_id,id,data) values($1,$2,$3::text::jsonb) on conflict(owner_id,id) do update set data=excluded.data where savings_categories.data is distinct from excluded.data",
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
          "insert into public.savings_transactions(owner_id,id,root_id,sequence,category_id,cash_category_id,contract_id,data) values($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb) on conflict(owner_id,id) do nothing",
          [
            owner,
            r.id,
            r.rootId,
            r.sequence,
            t.categoryId,
            "cashCategoryId" in t ? t.cashCategoryId : null,
            "contractId" in t ? t.contractId : null,
            JSON.stringify(r),
          ],
        );
        if (r.transaction?.kind === "sellGold")
          for (const a of r.transaction.allocations)
            await query(
              "insert into public.savings_allocations(owner_id,revision_id,lot_id) values($1,$2,$3) on conflict do nothing",
              [owner, r.id, a.lotId],
            );
      }
      for (const p of changedRecords(
        baseline?.prices,
        book.prices,
        (p) => p.id,
      ))
        await query(
          "insert into public.savings_prices(owner_id,id,category_id,sequence,data) values($1,$2,$3,$4,$5::text::jsonb) on conflict do nothing",
          [owner, p.id, p.categoryId, p.sequence, JSON.stringify(p)],
        );
      for (const c of changedRecords(
        baseline?.closes,
        book.closes,
        (c) => c.id,
      ))
        await query(
          "insert into public.savings_closes(owner_id,id,sequence,data) values($1,$2,$3,$4::text::jsonb) on conflict do nothing",
          [owner, c.id, c.sequence, JSON.stringify(c)],
        );
      const a = book.audit.at(-1)!;
      await query(
        "insert into public.savings_audit(owner_id,version,at,action) values($1,$2,$3,$4::text::jsonb)",
        [owner, a.version, a.at, JSON.stringify(a.action)],
      );
      baseline = structuredClone(book);
    },
    async remember(id, value) {
      await query(
        "insert into public.savings_commands(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
        [owner, id, value.fingerprint, JSON.stringify(value.result)],
      );
    },
  };
}
export function postgresSavingsRepository(
  sql: postgres.Sql,
): SavingsRepository {
  return {
    async transaction<T>(
      owner: string,
      fn: (tx: SavingsTransactionRepository) => Promise<T>,
    ): Promise<T> {
      if (!/^[0-9a-f-]{36}$/i.test(owner))
        throw new Error("Invalid authenticated owner");
      return (await withOwnerTransaction(sql, owner, async (tx) => {
        await lockOwner(tx, [`savings:${owner}`]);
        return fn(adapter(tx, owner));
      })) as T;
    },
  };
}
