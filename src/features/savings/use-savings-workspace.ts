"use client";

import { useI18n } from "@/i18n/provider";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { activeTransactions, endOfMonth } from "@/domain/savings/engine";
import { buildReport, type ReportFilter } from "@/domain/savings/reports";

import type { SavingsView } from "@/domain/savings/types";

import { useCallback, useEffect, useRef, useState } from "react";
import { SavingsAPIError, downloadSavings, savingsJSON } from "./api";

import { type EditorMode } from "./editor-config";

export function useSavingsWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
  const { t: tr, locale, config: localize } = useI18n("savings");
  const toast = useToast();
  const money = useMoney(),
    hidden = useMoneyHidden();
  const [month, setMonth] = useState(initialToday.slice(0, 7)),
    [view, setView] = useState<SavingsView | null>(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [status, setStatus] = useState(0),
    [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorMode | null>(null),
    [details, setDetails] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportFilter>({
    from: `${initialToday.slice(0, 4)}-01-01`,
    to: initialToday,
  });
  const [activityCategory, setActivityCategory] = useState(""),
    [activityKind, setActivityKind] = useState("");
  const request = useRef(0);
  const load = useCallback(async () => {
    const n = ++request.current;
    setLoading(true);
    try {
      const v = await savingsJSON<SavingsView>(`?month=${month}`);
      if (request.current === n) {
        setView(v);
        setError("");
        setStatus(0);
      }
      return v;
    } catch (e) {
      if (request.current === n) {
        setError(e instanceof Error ? e.message : tr("Chưa tải được dữ liệu."));
        setStatus(e instanceof SavingsAPIError ? e.status : 0);
      }
      throw e;
    } finally {
      if (request.current === n) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Locale changes must not recreate the request controller or trigger a data reload.
  }, [month]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the configured and unconfigured initial-load lifecycle.
    if (configured) void load().catch(() => {});
    else setLoading(false);
  }, [configured, load]);
  const today = view?.today ?? initialToday;
  const categories = view?.book?.categories ?? [];
  const report = (() => {
    if (!view) return null;
    try {
      return buildReport(view.book, filter, {
        today,
        now: `${today}T00:00:00Z`,
      });
    } catch {
      return null;
    }
  })();
  const monthly = view
    ? buildReport(
        view.book,
        { from: `${month}-01`, to: endOfMonth(month) },
        { today, now: `${today}T00:00:00Z` },
      )
    : null;
  const overviewReport = view
    ? buildReport(
        view.book,
        { from: `${month.slice(0, 4)}-01-01`, to: endOfMonth(month) },
        { today, now: `${today}T00:00:00Z` },
      )
    : null;
  const transactions = view?.book
    ? activeTransactions(view.book).map((r) => r.transaction)
    : [];
  const selected = details
    ? view?.state.positions.find((p) => p.id === details)
    : undefined;
  const display = (v: string | null) =>
    v === null ? tr("Thiếu định giá") : money(v);
  async function download(path: string, name: string) {
    try {
      await downloadSavings(path, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Chưa xuất được dữ liệu."));
    }
  }
  const monthlyTransactions = transactions.filter(
    (t) =>
      t.date >= `${month}-01` &&
      t.date <= endOfMonth(month) &&
      (!activityCategory ||
        t.categoryId === activityCategory ||
        ("cashCategoryId" in t && t.cashCategoryId === activityCategory)) &&
      (!activityKind || t.kind === activityKind),
  );
  const reportIds = new Set(report?.effects.map((effect) => effect.id));
  const reportTransactions = transactions.filter((t) => reportIds.has(t.id));
  return {
    localize,
    tr,
    display,
    hidden,
    locale,
    money,
    setDetails,
    configured,
    error,
    status,
    load,
    loading,
    view,
    month,
    today,
    setMonth,
    setEditor,
    categories,
    tab,
    setTab,
    monthly,
    overviewReport,
    activityCategory,
    setActivityCategory,
    activityKind,
    setActivityKind,
    monthlyTransactions,
    setFilter,
    filter,
    report,
    download,
    reportTransactions,
    selected,
    editor,
    toast,
  };
}
