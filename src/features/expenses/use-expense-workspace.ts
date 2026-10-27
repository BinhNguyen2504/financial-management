"use client";

import { useI18n } from "@/i18n/provider";
import { hiddenColumns } from "@/components/column-table";

import { useMoney } from "@/components/privacy";

import { useToast } from "@/components/toast";
import { usePreference } from "@/components/ui-preferences";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";

import { vietnamClock } from "@/domain/expenses/engine";
import { summarize } from "@/domain/expenses/reports";
import type { ExpenseRow, ExpenseView } from "@/domain/expenses/types";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJSON } from "./api";

import { type EditorMode } from "./editor-config";
import { sum } from "./format";

export function useExpenseWorkspace({ configured }: { configured: boolean }) {
  const { t: tr, locale } = useI18n("expenses");
  const toast = useToast();
  const money = useMoney();
  const [columnPreference] = usePreference(
    "fm-columns:expenses-workspace-2",
    "[]",
  );
  const hidden = hiddenColumns(columnPreference);
  const [view, setView] = useState<ExpenseView | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [kind, setKind] = useState("");
  const [method, setMethod] = useState("");
  const [group, setGroup] = useState("");
  const [inactive, setInactive] = useState(false);
  const [tab, setTab] = useState("month");
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [detailSelection, setDetail] = useState<ExpenseRow | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(configured);
  const [needsLogin, setNeedsLogin] = useState(false);
  const requestId = useRef(0);
  const calendarYear = useRef<number | null>(null);
  const selectedYearRef = useRef(year);
  // eslint-disable-next-line react-hooks/refs -- Foreground callbacks need the selected year immediately without changing reload timing.
  selectedYearRef.current = year;
  const reload = useForegroundRefresh(
    useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const next = await apiJSON<ExpenseView>("");
        if (id === requestId.current) {
          if (
            calendarYear.current !== null &&
            calendarYear.current !== next.currentYear &&
            selectedYearRef.current === calendarYear.current
          ) {
            setYear(next.currentYear);
            setMonth(Number(next.today.slice(5, 7)));
            setTab("month");
          }
          calendarYear.current = next.currentYear;
          setView(next);
          setNeedsLogin(false);
          setError("");
          setYear((y) => y ?? next.currentYear);
          setMonth((m) => m ?? Number(next.today.slice(5, 7)));
        }
        return next;
      } catch (e) {
        if (id === requestId.current) {
          const auth =
            e instanceof Error && "code" in e && e.code === "UNAUTHENTICATED";
          if (auth) {
            setNeedsLogin(true);
            setView(null);
            setEditor(null);
            setDetail(null);
          }
          setError(
            e instanceof Error
              ? e.message
              : tr("Không thể tải dữ liệu. Vui lòng thử lại."),
          );
        }
        throw e;
      } finally {
        if (id === requestId.current) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Locale changes must not recreate the request controller or trigger a data reload.
    }, []),
    configured,
  );
  useEffect(() => {
    if (!configured) return;
    void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the latest request sequence on cleanup, including requests started after mount.
      requestId.current++;
    };
  }, [configured, reload]);
  useEffect(() => {
    if (!configured || !view) return;
    const nextMidnight =
      new Date(`${view.today}T00:00:00+07:00`).getTime() + 86400000;
    const timer = window.setTimeout(
      () => void reload().catch(() => {}),
      Math.min(86400000, Math.max(1000, nextMidnight - Date.now() + 1000)),
    );
    return () => window.clearTimeout(timer);
  }, [configured, view, reload]);
  function openEditor(next: EditorMode) {
    setEditor(next);
    setEditorKey((k) => k + 1);
  }
  async function saved() {
    setEditor(null);
    setNotice("");
    try {
      await reload();
    } catch {
      setNotice(
        tr("Đã lưu thay đổi. Chưa tải lại được dữ liệu; hãy thử tải lại."),
      );
      toast("warning", tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu."));
    }
  }
  const currentYear =
    view?.currentYear ?? Number(vietnamClock().today.slice(0, 4));
  const selectedYear = year ?? currentYear;
  const selectedMonth = `${selectedYear}-${String(month ?? 1).padStart(2, "0")}`;
  const period = view?.book?.years.find((y) => y.year === selectedYear);
  const outsideYears =
    !!view?.book &&
    (selectedYear < Number(view.book.start.slice(0, 4)) ||
      selectedYear > currentYear);
  const readonly = outsideYears || Boolean(period?.closedAt);
  const rows =
    view?.rows.filter(
      (r) =>
        r.month === selectedMonth &&
        (!kind || r.kind === kind) &&
        (!method || r.method === method) &&
        (!group || r.group === group) &&
        (inactive || r.active),
    ) ?? [];
  const yearRows =
    view?.rows.filter((r) => r.month.startsWith(String(selectedYear))) ?? [];
  const detail = detailSelection
    ? (view?.rows.find(
        (r) =>
          r.jarId === detailSelection.jarId &&
          r.month === detailSelection.month,
      ) ?? detailSelection)
    : null;
  const archivedTotals =
    selectedYear < currentYear ? summarize(yearRows, () => "year")[0] : null;
  const archivedMonths =
    selectedYear < currentYear ? summarize(yearRows, (r) => r.month) : [];
  const methods = [...new Set(yearRows.map((r) => r.method))].sort();
  const groups = [
    ...new Set(yearRows.map((r) => r.group).filter(Boolean)),
  ].sort();
  const total = (field: "target" | "required" | "spent" | "closing") =>
    sum(rows.map((r) => r[field]));
  const future = view ? selectedMonth > view.today.slice(0, 7) : false;
  const funding = sum(
    rows.map((r) => (BigInt(r.funding) + BigInt(r.extra)).toString()),
  );
  return {
    tr,
    view,
    setLabelsOpen,
    readonly,
    openEditor,
    configured,
    loading,
    notice,
    error,
    needsLogin,
    reload,
    outsideYears,
    selectedYear,
    locale,
    currentYear,
    setYear,
    setMonth,
    setMethod,
    setGroup,
    setTab,
    month,
    tab,
    archivedTotals,
    money,
    archivedMonths,
    kind,
    setKind,
    method,
    methods,
    group,
    groups,
    inactive,
    setInactive,
    selectedMonth,
    total,
    future,
    funding,
    rows,
    setDetail,
    hidden,
    editor,
    editorKey,
    setEditor,
    saved,
    detail,
    yearRows,
    labelsOpen,
  };
}
