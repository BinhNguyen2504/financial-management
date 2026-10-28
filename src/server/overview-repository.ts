import type postgres from "postgres";
import { z } from "zod";
import {
  defaultLayout,
  layoutSchema,
  saveLayoutSchema,
  type SavedLayout,
} from "../domain/overview/layout";
import { ExpenseError } from "../domain/expenses/engine";
import { withOwnerTransaction, lockOwner } from "./owner-transaction";
export function postgresOverviewRepository(sql: postgres.Sql) {
  async function transaction<T>(
    owner: string,
    run: (tx: postgres.TransactionSql) => Promise<T>,
  ) {
    z.uuid().parse(owner);
    return withOwnerTransaction(sql, owner, async (tx) => {
      const [schema] = await tx.unsafe<{ ready: boolean }[]>(
        "select to_regclass('public.overview_layouts') is not null as ready",
      );
      if (!schema.ready)
        throw new ExpenseError(
          "Chưa thể lưu bố cục. Hãy cập nhật cấu hình hệ thống.",
          503,
          "OVERVIEW_SCHEMA_REQUIRED",
        );
      return run(tx);
    });
  }
  return {
    read(owner: string): Promise<SavedLayout> {
      return transaction(owner, async (tx) => {
        const [row] = await tx.unsafe<{ layout: unknown; revision: number }[]>(
          "select layout,revision from public.overview_layouts where owner_id=$1",
          [owner],
        );
        return row
          ? { ...layoutSchema.parse(row.layout), revision: row.revision }
          : defaultLayout();
      });
    },
    save(owner: string, input: unknown): Promise<SavedLayout> {
      const { expectedRevision, ...layout } = saveLayoutSchema.parse(input);
      return transaction(owner, async (tx) => {
        await lockOwner(tx, [`overview:${owner}`]);
        const [row] = await tx.unsafe<{ revision: number }[]>(
          "select revision from public.overview_layouts where owner_id=$1",
          [owner],
        );
        if ((row?.revision ?? 0) !== expectedRevision)
          throw new ExpenseError(
            "Bố cục đã đổi trên thiết bị khác. Tải bố cục mới để tiếp tục.",
            409,
            "LAYOUT_CONFLICT",
          );
        const revision = expectedRevision + 1;
        await tx.unsafe(
          "insert into public.overview_layouts(owner_id,layout,revision) values($1,$2::text::jsonb,$3) on conflict(owner_id) do update set layout=excluded.layout,revision=excluded.revision,updated_at=now()",
          [owner, JSON.stringify(layout), revision],
        );
        return { ...layout, revision };
      });
    },
  };
}
