"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import type { ExpenseCommand } from "@/domain/expenses/schema";
import type { ExpenseRow, ExpenseView } from "@/domain/expenses/types";
import { useI18n } from "@/i18n/provider";
import { generationHeaders, generationOf } from "@/lib/data-generation";
import { apiJSON, RequestError } from "./api";

/** Whether a row counts as already put in the jar. Sealed rows have no flag and were funded. */
export const isFunded = (row: ExpenseRow) => row.funded !== false;
/** Planned months and stopped jars cannot be marked (the engine rejects them too). */
export const canMarkFunded = (row: ExpenseRow) =>
  row.status !== "planned" && row.active;
const keyOf = (row: ExpenseRow) => `${row.jarId}/${row.month}`;

/**
 * One-tap "đã bỏ hũ" mark. It commits straight away, so a second tap undoes it.
 * Taps on different jars are queued and sent one after another because every
 * command carries the book version; each jar shows its own pending state.
 */
export function useFundedToggle({
  view,
  acceptView,
  reload,
}: {
  view: ExpenseView | null;
  acceptView: (next: ExpenseView) => void;
  reload: () => Promise<ExpenseView>;
}) {
  const { t: tr } = useI18n("expenses");
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const queued = useRef(new Set<string>());
  const chain = useRef<Promise<void>>(Promise.resolve());
  // The newest view this hook knows, so queued commands carry the latest version.
  const latest = useRef(view);
  const signedOut = useRef(false);
  useEffect(() => {
    latest.current = view;
  }, [view]);
  function settle(key: string) {
    queued.current.delete(key);
    setPending(new Set(queued.current));
  }
  async function send(row: ExpenseRow, funded: boolean) {
    const current = latest.current;
    if (!current?.book || signedOut.current) return;
    const command: ExpenseCommand = {
      id: crypto.randomUUID(),
      expectedVersion: current.book.version,
      action: {
        type: "setJarFunded",
        jarId: row.jarId,
        month: row.month,
        funded,
      },
    };
    try {
      const result = await apiJSON<{ view?: ExpenseView }>(
        "/commands?return=view",
        {
          method: "POST",
          headers: generationHeaders(generationOf(current)),
          body: JSON.stringify(command),
        },
      );
      if (result.view) {
        latest.current = result.view;
        acceptView(result.view);
      } else latest.current = await reload();
      toast(
        "success",
        funded
          ? tr("Đã đánh dấu {0} đã bỏ hũ.", { 0: row.name })
          : tr("Đã bỏ đánh dấu bỏ hũ của {0}.", { 0: row.name }),
      );
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) {
        signedOut.current = true;
        router.replace("/login?next=%2Fbudgets");
        return;
      }
      const unknownWrite =
        !(e instanceof RequestError) ||
        e.status === undefined ||
        e.status === 0 ||
        e.status >= 500 ||
        e.code === "INVALID_RESPONSE";
      if (unknownWrite) {
        // The write may have landed; show the stored state instead of guessing.
        toast(
          "warning",
          tr("Chưa xác nhận được kết quả lưu. Đã tải lại dữ liệu để kiểm tra."),
        );
      } else {
        toast(
          "error",
          e.code === "VERSION_CONFLICT"
            ? tr("Dữ liệu đã thay đổi ở nơi khác. Đã tải lại, hãy thử lại.")
            : e.message,
        );
      }
      await reload()
        .then((next) => (latest.current = next))
        .catch(() => {});
    }
  }
  function toggle(row: ExpenseRow) {
    const key = keyOf(row);
    if (!latest.current?.book || queued.current.has(key)) return;
    const funded = !isFunded(row);
    queued.current.add(key);
    setPending(new Set(queued.current));
    chain.current = chain.current
      .then(() => send(row, funded))
      .finally(() => settle(key));
  }
  return {
    toggle,
    isPending: (row: ExpenseRow) => pending.has(keyOf(row)),
    /** True while any mark is being saved; for the screen-reader status. */
    saving: pending.size > 0,
  };
}
