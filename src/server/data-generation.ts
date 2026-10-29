import type postgres from "postgres";
import { ExpenseError } from "../domain/expenses/engine";

type DB = Pick<postgres.Sql, "unsafe">;

export async function dataGeneration(db: DB, owner: string) {
  const [schema] = await db.unsafe<{ ready: boolean }[]>(
    "select to_regclass('public.data_generations') is not null as ready",
  );
  if (!schema.ready) return 0;
  const [row] = await db.unsafe<{ generation: number }[]>(
    "select generation from public.data_generations where owner_id=$1",
    [owner],
  );
  return row?.generation ?? 0;
}

export function requestDataGeneration(request: Request) {
  const raw = request.headers.get("X-Data-Generation") ?? "0";
  if (!/^(0|[1-9]\d*)$/.test(raw) || !Number.isSafeInteger(Number(raw)))
    throw new ExpenseError("Yêu cầu không hợp lệ.", 400, "INVALID_INPUT");
  return Number(raw);
}

/** Must run after the module advisory lock and before command receipt lookup. */
export async function withDataGeneration<T>(
  db: DB,
  owner: string,
  expected: number | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const generation = await dataGeneration(db, owner);
  if (expected !== undefined && expected !== generation)
    throw new ExpenseError(
      "Dữ liệu tài chính đã được làm trống ở phiên khác. Hãy tải lại trang trước khi tiếp tục; bản nháp chưa được gửi lại.",
      409,
      "DATA_GENERATION_CHANGED",
    );
  const value = await run();
  // HTTP view metadata stays outside domain books and financial backup formats.
  return value && typeof value === "object" && "book" in value
    ? { ...value, dataGeneration: generation }
    : value;
}
