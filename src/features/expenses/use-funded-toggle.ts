"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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

/**
 * One-tap "đã bỏ hũ" mark. It commits straight away, so a second tap undoes it.
 * Only one command runs at a time because every command carries the book version.
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
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const running = useRef(false);
  async function toggle(row: ExpenseRow) {
    if (!view?.book || running.current) return;
    running.current = true;
    const funded = !isFunded(row);
    const key = `${row.jarId}/${row.month}`;
    setBusyKey(key);
    const command: ExpenseCommand = {
      id: crypto.randomUUID(),
      expectedVersion: view.book.version,
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
          headers: generationHeaders(generationOf(view)),
          body: JSON.stringify(command),
        },
      );
      if (result.view) acceptView(result.view);
      else await reload();
      toast(
        "success",
        funded
          ? tr("Đã đánh dấu {0} đã bỏ hũ.", { 0: row.name })
          : tr("Đã bỏ đánh dấu bỏ hũ của {0}.", { 0: row.name }),
      );
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) {
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
      await reload().catch(() => {});
    } finally {
      running.current = false;
      setBusyKey(null);
    }
  }
  return { toggle, busyKey, busy: busyKey !== null };
}
