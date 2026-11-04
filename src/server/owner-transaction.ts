import { recordDuration, timePhase } from "./performance";
import type postgres from "postgres";

type Transaction = postgres.TransactionSql;

export async function setTransactionOwner(
  tx: Pick<Transaction, "unsafe">,
  owner: string,
) {
  await timePhase("sql", () => tx.unsafe("set local role authenticated"));
  await timePhase("sql", () =>
    tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: owner, role: "authenticated" }),
    ]),
  );
}

/** Identity comes from verified Auth. Validation and locks belong to callers. */
export async function withOwnerTransaction<T>(
  sql: postgres.Sql,
  owner: string,
  run: (tx: Transaction) => Promise<T>,
  readOnly = false,
): Promise<T> {
  const started = performance.now();
  return (await sql.begin(
    readOnly ? "isolation level repeatable read read only" : "",
    async (tx) => {
      recordDuration("db_acquire", started);
      await setTransactionOwner(tx, owner);
      return run(tx);
    },
  )) as T;
}

/** Callers specify the existing lock keys and their global acquisition order. */
export async function lockOwner(
  tx: Pick<Transaction, "unsafe">,
  keys: readonly string[],
) {
  for (const key of keys)
    await timePhase("lock", () =>
      tx.unsafe("select pg_advisory_xact_lock(hashtextextended($1,0))", [key]),
    );
}
