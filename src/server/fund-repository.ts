import { withOwnerTransaction, lockOwner } from "./owner-transaction";
import { changedRecords } from "./changed-records";
import type postgres from "postgres";
import { z } from "zod";
import type { FundBook } from "../domain/funds/types";
import { FundError, livingSource } from "../domain/funds/engine";
import { transactionAdapter as expenseAdapter } from "./expense-repository";
import type {
  FundRepository,
  FundStoredCommand,
  FundTransactionRepository,
} from "../application/funds";
function adapter(
  db: Pick<postgres.Sql, "unsafe">,
  owner: string,
): FundTransactionRepository {
  const query = <T extends postgres.Row>(
    sql: string,
    args: (string | number | null)[] = [],
  ) => db.unsafe<T[]>(sql, args);
  let baseline: FundBook | undefined;
  return {
    async read() {
      const [head] = await query<{ version: number }>(
        "select version from public.funds_books where owner_id=$1",
        [owner],
      );
      if (!head) return null;
      const data = async <T>(table: string, order: string) =>
        (
          await query<{ data: T }>(
            `select data from public.${table} where owner_id=$1 order by ${order}`,
            [owner],
          )
        ).map((r) => r.data);
      const funds = (
        await query<{ id: FundBook["funds"][number] }>(
          "select id from public.funds_definitions where owner_id=$1 order by id",
          [owner],
        )
      ).map((r) => r.id);
      const configurations = await data<FundBook["configurations"][number]>(
        "funds_configurations",
        "sequence",
      );
      const locations = await data<FundBook["locations"][number]>(
        "funds_locations",
        "id",
      );
      const revisions = await data<FundBook["revisions"][number]>(
        "funds_transactions",
        "sequence",
      );
      const audit = await query<FundBook["audit"][number]>(
        `select version,to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as at,action from public.funds_audit where owner_id=$1 order by version`,
        [owner],
      );
      const book: FundBook = {
        ...head,
        funds,
        configurations,
        locations,
        revisions,
        audit: [...audit],
      };
      baseline = structuredClone(book);
      return book;
    },
    async source(month) {
      return livingSource(await expenseAdapter(db, owner).read(), month);
    },
    async command(id) {
      return (
        (
          await query<FundStoredCommand>(
            "select fingerprint,result from public.funds_commands where owner_id=$1 and id=$2",
            [owner, id],
          )
        )[0] ?? null
      );
    },
    async save(book) {
      await query(
        "insert into public.funds_books(owner_id,version) values($1,$2) on conflict(owner_id) do update set version=excluded.version",
        [owner, book.version],
      );
      for (const id of book.funds.filter((id) => !baseline?.funds.includes(id)))
        await query(
          "insert into public.funds_definitions(owner_id,id) values($1,$2) on conflict do nothing",
          [owner, id],
        );
      for (const l of changedRecords(
        baseline?.locations,
        book.locations,
        (l) => l.id,
      ))
        await query(
          "insert into public.funds_locations(owner_id,id,data) values($1,$2,$3::text::jsonb) on conflict(owner_id,id) do update set data=excluded.data where funds_locations.data is distinct from excluded.data",
          [owner, l.id, JSON.stringify(l)],
        );
      for (const c of changedRecords(
        baseline?.configurations,
        book.configurations,
        (c) => c.id,
      ))
        await query(
          "insert into public.funds_configurations(owner_id,id,sequence,data) values($1,$2,$3,$4::text::jsonb) on conflict do nothing",
          [owner, c.id, c.sequence, JSON.stringify(c)],
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
          "insert into public.funds_transactions(owner_id,id,root_id,sequence,fund_id,location_id,to_fund_id,to_location_id,data) values($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb) on conflict do nothing",
          [
            owner,
            r.id,
            r.rootId +
              ":" +
              book.revisions.find((x) => x.rootId === r.rootId)!.sequence,
            r.sequence,
            t.fundId,
            t.locationId,
            t.kind === "transfer" ? t.toFundId : null,
            t.kind === "transfer" ? t.toLocationId : null,
            JSON.stringify(r),
          ],
        );
      }
      const a = book.audit.at(-1)!;
      await query(
        "insert into public.funds_audit(owner_id,version,at,action) values($1,$2,$3,$4::text::jsonb)",
        [owner, a.version, a.at, JSON.stringify(a.action)],
      );
      baseline = structuredClone(book);
    },
    async remember(id, value) {
      await query(
        "insert into public.funds_commands(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
        [owner, id, value.fingerprint, JSON.stringify(value.result)],
      );
    },
  };
}
export function postgresFundRepository(sql: postgres.Sql): FundRepository {
  return {
    async transaction<T>(
      owner: string,
      fn: (tx: FundTransactionRepository) => Promise<T>,
    ): Promise<T> {
      z.uuid().parse(owner);
      return (await withOwnerTransaction(sql, owner, async (tx) => {
        const [ready] = await tx.unsafe<{ ready: boolean }[]>(
          "select to_regclass('public.funds_books') is not null as ready",
        );
        if (!ready.ready)
          throw new FundError(
            "Quỹ an toàn chưa được bật trên hệ thống. Cần áp dụng migration Fund theo hướng dẫn triển khai.",
            503,
            "FUNDS_MIGRATION_REQUIRED",
          );
        // Match restore's global lock order: Expenses first, then Fund.
        await lockOwner(tx, [owner, `funds:${owner}`]);
        return fn(adapter(tx, owner));
      })) as T;
    },
  };
}
