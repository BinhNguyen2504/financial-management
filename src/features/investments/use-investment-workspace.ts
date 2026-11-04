"use client";
import { useViewState } from "@/components/use-view-state";

import { useI18n } from "@/i18n/provider";

import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { activeTransactions, ruleAt } from "@/domain/investments/engine";
import { buildReport, type ReportFilter } from "@/domain/investments/reports";
import type {
  InvestmentTransaction,
  InvestmentView,
} from "@/domain/investments/types";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadInvestment, InvestmentAPIError, investmentsJSON } from "./api";

import { type EditorMode } from "./editor-config";

const tabs = [
  ["portfolio", "Danh mục"],
  ["transactions", "Giao dịch"],
  ["reports", "Báo cáo"],
  ["manage", "Quản lý"],
] as const;
export function useInvestmentWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
  const { t: tr, locale, config: localize } = useI18n("investments");
  const localizedTabs = localize(tabs);
  const toast = useToast();
  const money = useMoney(),
    hidden = useMoneyHidden(),
    [date, setDate] = useViewState("investments", "date", initialToday),
    [view, setView] = useState<InvestmentView | null>(null),
    [tab, setTab] = useViewState<string>(
      "investments",
      "tab",
      "portfolio",
      (v) =>
        typeof v === "string" &&
        ["portfolio", "transactions", "reports", "manage"].includes(v),
    ),
    [error, setError] = useState(""),
    [status, setStatus] = useState(0),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<EditorMode | null>(null),
    [details, setDetails] = useState<string | null>(null),
    [transaction, setTransaction] = useState<string | null>(null);
  const [filter, setFilter] = useViewState<ReportFilter>(
      "investments",
      "reportFilter",
      {
        from: `${initialToday.slice(0, 4)}-01-01`,
        to: initialToday,
      },
    ),
    [activityCategory, setActivityCategory] = useViewState(
      "investments",
      "activityCategory",
      "",
    ),
    [activityKind, setActivityKind] = useViewState(
      "investments",
      "activityKind",
      "",
    ),
    [from, setFrom] = useViewState("investments", "from", ""),
    [to, setTo] = useViewState("investments", "to", initialToday),
    [includeCancelled, setIncludeCancelled] = useViewState(
      "investments",
      "includeCancelled",
      false,
    );
  const request = useRef(0);
  const load = useCallback(async () => {
    const n = ++request.current;
    setLoading(true);
    try {
      const v = await investmentsJSON<InvestmentView>(`?asOf=${date}`);
      if (n === request.current) {
        setView(v);
        setError("");
        setStatus(0);
      }
      return v;
    } catch (e) {
      if (n === request.current) {
        setError(e instanceof Error ? e.message : tr("Không thể tải dữ liệu."));
        setStatus(e instanceof InvestmentAPIError ? e.status : 0);
      }
      throw e;
    } finally {
      if (n === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Locale changes must not recreate the request controller or trigger a data reload.
  }, [date]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the configured and unconfigured initial-load lifecycle.
    if (configured) void load().catch(() => {});
    else setLoading(false);
  }, [configured, load]);
  const book = view?.book,
    categories = book?.categories ?? [],
    state = view?.state;
  const name = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (ruleAt(c, date)?.name ?? c.rules[0].name) : id;
  };
  const display = (v: string | null) =>
    v === null ? tr("Thiếu định giá") : money(v);
  const sum = (values: (string | null)[]) =>
    values.reduce<bigint>((n, x) => n + BigInt(x ?? "0"), 0n).toString();
  const investments = view?.portfolios ?? [],
    wallets = state?.positions.filter((p) => p.kind === "cash") ?? [];
  const unrealized = investments.some((p) => p.unrealized === null)
    ? null
    : sum(investments.map((p) => p.unrealized));
  const report = useMemo(() => {
    try {
      return view && tab === "reports"
        ? buildReport(view.book, filter, {
            today: view.today,
            now: `${view.today}T00:00:00Z`,
          })
        : null;
    } catch {
      return null;
    }
  }, [view, filter, tab]);
  const live = useMemo(() => (book ? activeTransactions(book) : []), [book]);
  const sequences = useMemo(
    () => new Map(book?.revisions.map((r) => [r.id, r.sequence])),
    [book],
  );
  const rows: { t: InvestmentTransaction; cancelled: boolean }[] = live.map(
    (r) => ({ t: r.transaction, cancelled: false }),
  );
  if (includeCancelled && book) {
    const ids = new Set(live.map((r) => r.transaction.id));
    for (const r of book.revisions.filter(
      (r) => r.id === r.rootId && r.transaction && !ids.has(r.rootId),
    ))
      rows.push({ t: r.transaction!, cancelled: true });
  }
  const visible = rows
    .filter(
      ({ t }) =>
        t.date <= date &&
        (!from || t.date >= from) &&
        (!to || t.date <= to) &&
        (!activityKind || t.kind === activityKind) &&
        (!activityCategory ||
          t.categoryId === activityCategory ||
          ("cashCategoryId" in t && t.cashCategoryId === activityCategory)),
    )
    .sort(
      (a, b) =>
        b.t.date.localeCompare(a.t.date) ||
        (sequences.get(b.t.id) ?? 0) - (sequences.get(a.t.id) ?? 0),
    );
  const selected = state?.positions.find((p) => p.id === details);
  async function download(path: string, filename: string) {
    try {
      await downloadInvestment(path, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Không thể xuất dữ liệu."));
    }
  }
  function saved(next?: InvestmentView) {
    setEditor(null);
    setNotice("");
    if (next) {
      request.current++;
      setView(next);
      setError("");
      setStatus(0);
      setLoading(false);
      return;
    }
    void load().catch(() =>
      toast("warning", tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu.")),
    );
  }
  function open(mode: EditorMode) {
    setNotice("");
    setEditor(mode);
  }
  return {
    setDetails,
    tr,
    open,
    display,
    money,
    locale,
    configured,
    date,
    initialToday,
    setDate,
    view,
    loading,
    load,
    error,
    status,
    notice,
    localizedTabs,
    tab,
    setTab,
    state,
    sum,
    investments,
    wallets,
    unrealized,
    categories,
    from,
    setFrom,
    to,
    setTo,
    activityCategory,
    setActivityCategory,
    name,
    activityKind,
    setActivityKind,
    localize,
    includeCancelled,
    setIncludeCancelled,
    visible,
    setTransaction,
    report,
    filter,
    setFilter,
    download,
    selected,
    transaction,
    editor,
    saved,
    setEditor,
    hidden,
  };
}
