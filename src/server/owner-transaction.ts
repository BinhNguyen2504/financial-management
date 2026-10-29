import type postgres from "postgres";

type Transaction = postgres.TransactionSql;

export async function setTransactionOwner(
  tx: Pick<Transaction, "unsafe">,
  owner: string,
) {
  await tx.unsafe("set local role authenticated");
  await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: owner, role: "authenticated" }),
  ]);
}

/** Identity comes from verified Auth. Validation and locks belong to callers. */
export async function withOwnerTransaction<T>(
  sql: postgres.Sql,
  owner: string,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return (await sql.begin(async (tx) => {
    await setTransactionOwner(tx, owner);
    return run(tx);
  })) as T;
}

/** Callers specify the existing lock keys and their global acquisition order. */
export async function lockOwner(
  tx: Pick<Transaction, "unsafe">,
  keys: readonly string[],
) {
  for (const key of keys)
    await tx.unsafe("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      key,
    ]);
}
