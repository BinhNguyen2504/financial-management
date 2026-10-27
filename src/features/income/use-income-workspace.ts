"use client";

import { useI18n } from "@/i18n/provider";

import { useMoney } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";

import { buildReport, type ReportFilter } from "@/domain/income/reports";
import type { IncomeView } from "@/domain/income/types";

import { useCallback, useEffect, useRef, useState } from "react";
import { IncomeAPIError, incomeJSON } from "./api";

import { type EditorMode } from "./editor-config";

import { useDisplayMoney } from "./report-panel";

export function useIncomeWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
  const { t: tr, locale } = useI18n("income");
  const toast = useToast();
  const money = useMoney();
  const displayMoney = useDisplayMoney();
  const [year, setYear] = useState(Number(initialToday.slice(0, 4)));
  const [month, setMonth] = useState(Number(initialToday.slice(5, 7)));
  const [view, setView] = useState<IncomeView | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [tab, setTab] = useState("month");
  const [kind, setKind] = useState<ReportFilter["kind"]>("all");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(12);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [details, setDetails] = useState<{ month?: string } | null>(null);
  const requestId = useRef(0);
  const reload = useForegroundRefresh(
    useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const next = await incomeJSON<IncomeView>(`?year=${year}`);
        if (id === requestId.current) {
          setView(next);
          setNeedsLogin(false);
          setError("");
        }
        return next;
      } catch (e) {
        if (id === requestId.current) {
          setError(
            e instanceof Error
              ? e.message
              : tr("Không thể tải dữ liệu. Hãy thử lại."),
          );
          if (e instanceof IncomeAPIError && e.status === 401) {
            setNeedsLogin(true);
            setView(null);
          }
        }
        throw e;
      } finally {
        if (id === requestId.current) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Locale changes must not recreate the request controller or trigger a data reload.
    }, [year]),
    configured,
  );
  useEffect(() => {
    if (!configured) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the current year view before the existing immediate reload.
    setLoading(true);
    setView(null);
    void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the latest request sequence on cleanup, including requests started after mount.
      requestId.current++;
    };
  }, [configured, reload]);
  useEffect(() => {
    if (!view) return;
    const midnight =
      new Date(`${view.today}T00:00:00+07:00`).getTime() + 86400000;
    const timer = window.setTimeout(
      () => void reload().catch(() => {}),
      Math.min(86400000, Math.max(1000, midnight - Date.now() + 1000)),
    );
    return () => window.clearTimeout(timer);
  }, [view, reload]);
  const today = view?.today ?? initialToday;
  const selectedMonth = `${year}-${String(month).padStart(2, "0")}`;
  const future = selectedMonth > today.slice(0, 7);
  const filter: ReportFilter = {
    year,
    from,
    to,
    kind,
    categoryId: categoryId || undefined,
  };
  const report = view?.year === year ? buildReport(view, filter) : null;
  const rows = view?.rows.filter((r) => r.month === selectedMonth) ?? [];
  const fixedRows = rows.filter((r) => r.kind === "fixed");
  const oneOffRows = rows.filter((r) => r.kind === "oneoff");
  const total = rows.some((r) => r.amount !== null)
    ? rows.reduce((n, r) => n + BigInt(r.amount ?? 0), 0n).toString()
    : null;
  const missing = future
    ? 0
    : fixedRows.filter((r) => r.amount === null).length;
  const categories = view?.book?.categories.filter((c) => !c.deleted) ?? [];
  function open(mode: EditorMode) {
    setEditor(mode);
    setEditorKey((k) => k + 1);
    setNotice("");
  }
  async function saved() {
    setEditor(null);
    setNotice("");
    try {
      await reload();
    } catch {
      setNotice(
        tr("Đã lưu trên server. Chưa tải lại được dữ liệu; hãy thử tải lại."),
      );
      toast("warning", tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu."));
    }
  }
  async function download() {
    try {
      const params = new URLSearchParams({
        year: String(year),
        from: String(from),
        to: String(to),
        kind,
        format: "csv",
        locale,
        ...(categoryId ? { categoryId } : {}),
      });
      const response = await fetch(`/api/v1/income/reports?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `income-${year}-${from}-${to}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Không thể xuất CSV. Hãy thử lại."),
      );
    }
  }
  return {
    tr,
    locale,
    money,
    open,
    configured,
    error,
    loading,
    reload,
    needsLogin,
    view,
    notice,
    year,
    setYear,
    month,
    setMonth,
    future,
    tab,
    setTab,
    selectedMonth,
    displayMoney,
    total,
    missing,
    fixedRows,
    oneOffRows,
    today,
    categories,
    report,
    from,
    to,
    setFrom,
    setTo,
    kind,
    setKind,
    setCategoryId,
    categoryId,
    download,
    setDetails,
    editor,
    editorKey,
    setEditor,
    saved,
    details,
  };
}
