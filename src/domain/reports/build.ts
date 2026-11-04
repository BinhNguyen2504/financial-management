import { materialize } from "../expenses/engine";
import { toView as incomeView } from "../income/engine";
import { buildReport as incomeReport } from "../income/reports";
import { buildReport as savingsReport } from "../savings/reports";
import { buildReport as investmentReport } from "../investments/reports";
import { activeTransactions } from "../funds/engine";
import { view as goalView } from "../goals/engine";
import { goalSources } from "../goals/sources";
import type { GoalSources } from "../goals/schema";
import { previousDate, nextMonth } from "../savings/engine";
import { sumMoney } from "../shared/money";
import { vietnamClock } from "../shared/clock";
import type { Clock } from "../shared/types";
import { fundsAt, fundBookAt } from "./funds";
import {
  detailColumns,
  moneyColumn as money,
  textColumn as text,
  periodFor,
  reportSources,
  ReportError,
  type ReportInput,
  type ReportQuery,
  type Report,
  type Row,
  type Table,
  type Metric,
  type Period,
  type SourceId,
  type Cell,
} from "./model";

type Part = {
  metrics: Pick<Metric, "id" | "label" | "source" | "value">[];
  tables: Table[];
  details: Record<string, Row[]>;
  warnings: string[];
  unavailable: SourceId[];
};
const sum = (values: Cell[]) =>
  values.some((v) => v === null) ? null : sumMoney(values as string[]);
function changePercent(value: Cell, previous: Cell) {
  if (value === null || previous === null || BigInt(previous) <= 0n)
    return null;
  const n = ((BigInt(value) - BigInt(previous)) * 10000n) / BigInt(previous);
  const abs = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
const inPeriod = (value: string, p: Period) =>
  value >= p.from.slice(0, value.length) &&
  value <= p.asOf.slice(0, value.length);
const row = (
  id: string,
  date: string,
  name: string,
  kind: string,
  amount: Cell,
  note = "",
): Row => ({ id, date, name, kind, amount, note });
function part(source: SourceId, details: boolean, selected?: string) {
  const result: Part = {
    metrics: [],
    tables: [],
    details: {},
    warnings: [],
    unavailable: [],
  };
  const metric = (
    id: string,
    label: string,
    value: Cell,
    rows: () => Row[],
  ) => {
    const key = `${source}.${id}`;
    result.metrics.push({ id: key, label, source, value });
    if (
      details &&
      (!selected || selected === key || selected === "cashflow.difference")
    )
      result.details[key] = rows();
  };
  return { result, metric };
}

function buildSource(
  source: SourceId,
  input: ReportInput,
  p: Period,
  clock: Clock,
  options: ReportBuildOptions = {},
): Part {
  const detailOnly = Boolean(options.metric) || options.tables === false;
  const { result, metric } = part(
      source,
      options.details !== false,
      options.metric,
    ),
    books = input.books;
  if (source === "income") {
    const book = books.income ?? null;
    const report = incomeReport(
      incomeView(book, Number(p.from.slice(0, 4)), clock),
      {
        year: Number(p.from.slice(0, 4)),
        from: Number(p.from.slice(5, 7)),
        to: Number(p.asOf.slice(5, 7)),
        kind: "all",
      },
    );
    const rows = report.rows.map((r) =>
      row(
        `${r.key}:${r.month}`,
        r.month,
        r.name,
        r.kind === "fixed" ? "Cố định" : "Phát sinh",
        r.amount,
        r.note,
      ),
    );
    metric("total", "Thu nhập đã ghi nhận", report.total, () => rows);
    metric("fixed", "Thu cố định", report.fixed, () =>
      rows.filter((r) => r.kind === "Cố định"),
    );
    metric("oneoff", "Thu phát sinh", report.oneoff, () =>
      rows.filter((r) => r.kind === "Phát sinh"),
    );
    if (!detailOnly)
      result.tables.push({
        id: "income.months",
        title: "Thu nhập theo tháng",
        columns: [
          text("month", "Tháng"),
          money("total", "Thu nhập"),
          text("missing", "Khoản chưa nhập"),
        ],
        rows: report.months.map((m) => ({
          id: m.month,
          month: m.month,
          total: m.total,
          missing: String(m.missing),
        })),
      });
    if (!detailOnly)
      result.tables.push({
        id: "income.sources",
        title: "Nguồn thu",
        columns: detailColumns,
        rows,
      });
    if (report.missing)
      result.warnings.push(
        "Thu nhập còn khoản chưa nhập; tổng chỉ gồm số đã ghi nhận.",
      );
  } else if (source === "expenses") {
    const book = books.expenses ?? null;
    const selected = book
      ? materialize(book, clock).filter(
          (r) => inPeriod(r.month, p) && r.status !== "planned",
        )
      : [];
    const rows: Row[] = selected.map((r) => ({
      ...row(
        `${r.jarId}:${r.month}`,
        r.month,
        r.name,
        r.kind === "monthly" ? "Chi trong tháng" : "Tích lũy",
        r.spent,
        r.status === "provisional" ? "Tạm tính" : "",
      ),
      jarId: r.jarId,
      group: r.group || "Chưa phân nhóm",
      method: r.method,
    }));
    metric(
      "spent",
      "Chi tiêu theo sổ hũ",
      rows.length ? sum(rows.map((r) => r.amount)) : null,
      () => rows,
    );
    metric(
      "funding",
      "Tiền đã bỏ hũ",
      selected.length
        ? sumMoney(
            selected.map((r) =>
              (BigInt(r.funding) + BigInt(r.extra)).toString(),
            ),
          )
        : null,
      () =>
        selected.map((r) =>
          row(
            `${r.jarId}:${r.month}`,
            r.month,
            r.name,
            "Tiền đã bỏ hũ",
            (BigInt(r.funding) + BigInt(r.extra)).toString(),
          ),
        ),
    );
    const group = (
      field: "date" | "jarId" | "group" | "method",
      title: string,
    ) => {
      if (detailOnly) return;
      const groups = new Map<string, Row[]>();
      for (const r of rows) {
        const key = String(r[field]);
        groups.set(key, [...(groups.get(key) ?? []), r]);
      }
      if (!detailOnly)
        result.tables.push({
          id: `expenses.${field}`,
          title,
          columns: [text("name", title), money("spent", "Chi tiêu")],
          rows: [...groups].map(([name, entries]) => ({
            id: name,
            name: field === "jarId" ? entries.at(-1)!.name : name,
            spent: sum(entries.map((r) => r.amount)),
          })),
        });
    };
    group("date", "Chi tiêu theo tháng");
    group("jarId", "Chi tiêu theo hũ");
    group("group", "Chi tiêu theo nhóm");
    group("method", "Chi tiêu theo phương thức");
    const year = Number(p.from.slice(0, 4));
    if (
      book &&
      year < Number(clock.today.slice(0, 4)) &&
      selected.length &&
      !book.years.some((y) => y.year === year && y.closedAt)
    )
      result.warnings.push(
        "Chi tiêu năm cũ chưa chốt; số liệu có thể thay đổi.",
      );
    if (selected.some((r) => r.status === "provisional"))
      result.warnings.push("Chi tiêu tháng hiện tại là số tạm tính từ sổ hũ.");
  } else if (source === "savings") {
    const report = savingsReport(
      books.savings ?? null,
      { from: p.from, to: p.asOf },
      clock,
      { months: !detailOnly },
    );
    const populated = report.after.positions.length > 0;
    const positions = (opening: boolean) =>
      (opening ? report.before : report.after).positions.map((r) =>
        row(
          r.id,
          opening ? previousDate(p.from) : p.asOf,
          r.name,
          "Định giá",
          r.value,
          r.stale ? "Định giá cũ" : "",
        ),
      );
    const effects = report.effects;
    metric(
      "value",
      "Tiết kiệm cuối kỳ",
      populated ? report.after.total : null,
      () => positions(false),
    );
    metric(
      "opening",
      "Tiết kiệm đầu kỳ",
      populated ? report.before.total : null,
      () => positions(true),
    );
    for (const [id, label, sign] of [
      ["inflow", "Nạp bên ngoài", 1n],
      ["outflow", "Rút bên ngoài", -1n],
    ] as const) {
      metric(id, label, populated ? report.activity[id] : null, () =>
        effects
          .filter((e) => BigInt(e.external) * sign > 0n)
          .map((e) =>
            row(
              e.id,
              e.date,
              report.categories.find((c) => c.id === e.categoryId)?.name ?? "",
              label,
              (BigInt(e.external) * sign).toString(),
              e.note,
            ),
          ),
      );
    }
    metric("result", "Kết quả trong kỳ", populated ? report.result : null, () =>
      report.categories.map((c) =>
        row(c.id, p.asOf, c.name, "Kết quả trong kỳ", c.result),
      ),
    );
    if (!detailOnly)
      result.tables.push({
        id: "savings.months",
        title: "Tiết kiệm theo tháng",
        columns: [
          text("month", "Tháng"),
          money("value", "Giá trị cuối tháng"),
          money("inflow", "Nạp bên ngoài"),
          money("outflow", "Rút bên ngoài"),
          money("result", "Kết quả trong kỳ"),
        ],
        rows: report.months.map((m) => {
          const exists = books.savings?.categories.some(
            (c) => c.start.slice(0, 7) <= m.month,
          );
          return {
            id: m.month,
            month: m.month,
            value: exists ? m.value : null,
            inflow: exists ? m.inflow : null,
            outflow: exists ? m.outflow : null,
            result: exists ? m.result : null,
          };
        }),
      });
    if (!detailOnly)
      result.tables.push({
        id: "savings.categories",
        title: "Phân bổ Tiết kiệm",
        columns: [
          text("name", "Danh mục"),
          money("value", "Giá trị cuối kỳ"),
          text("date", "Ngày định giá"),
          text("note", "Trạng thái"),
        ],
        rows: positions(false).map((r) => ({
          ...r,
          value: r.amount,
          date: report.categories.find((c) => c.id === r.id)?.priceDate ?? null,
        })),
      });
    if (report.after.missing.length)
      result.warnings.push(
        "Tiết kiệm thiếu định giá; chưa đủ dữ liệu tính tổng.",
      );
    if (report.after.positions.some((r) => r.stale))
      result.warnings.push("Tiết kiệm đang dùng định giá cũ.");
  } else if (source === "investments") {
    const report = investmentReport(
      books.investments ?? null,
      { from: p.from, to: p.asOf },
      clock,
      { months: !detailOnly },
    );
    const assets = report.after.positions.filter(
        (r) => r.kind === "investment",
      ),
      wallets = report.after.positions.filter((r) => r.kind === "cash");
    const populated = report.after.positions.length > 0;
    const positions = report.after.positions.map((r) =>
      row(
        r.id,
        p.asOf,
        r.name,
        r.kind === "cash" ? "Tiền chờ" : "Tài sản đang giữ",
        r.value,
        r.stale ? "Định giá cũ" : "",
      ),
    );
    metric(
      "value",
      "Đầu tư cuối kỳ",
      populated ? report.after.total : null,
      () => positions,
    );
    metric(
      "cost",
      "Giá vốn đang giữ",
      populated ? sumMoney(assets.map((r) => r.cost)) : null,
      () =>
        assets.map((r) =>
          row(r.id, p.asOf, r.name, "Giá vốn đang giữ", r.cost),
        ),
    );
    metric(
      "assets",
      "Giá trị tài sản đang giữ",
      populated ? sum(assets.map((r) => r.value)) : null,
      () => positions.filter((r) => r.kind === "Tài sản đang giữ"),
    );
    metric(
      "cash",
      "Tiền chờ đầu tư",
      populated ? sumMoney(wallets.map((r) => r.cash)) : null,
      () => positions.filter((r) => r.kind === "Tiền chờ"),
    );
    metric(
      "profit",
      "Lãi/lỗ phần đang giữ",
      populated ? sum(assets.map((r) => r.unrealized)) : null,
      () =>
        assets.map((r) =>
          row(r.id, p.asOf, r.name, "Lãi/lỗ phần đang giữ", r.unrealized),
        ),
    );
    if (!detailOnly)
      result.tables.push({
        id: "investments.months",
        title: "Đầu tư theo tháng",
        columns: [
          text("month", "Tháng"),
          money("value", "Tổng giá trị"),
          money("cost", "Giá vốn đang giữ"),
          money("assetValue", "Giá trị tài sản đang giữ"),
          money("cash", "Tiền chờ"),
          money("profit", "Lãi/lỗ phần đang giữ"),
        ],
        rows: report.months.map((m) => ({
          id: m.month,
          month: m.month,
          value: m.value,
          cost: m.cost,
          assetValue: m.assetValue,
          cash: m.cash,
          profit: m.profit,
        })),
      });
    if (!detailOnly)
      result.tables.push({
        id: "investments.portfolios",
        title: "Danh mục Đầu tư",
        columns: [
          text("name", "Danh mục"),
          money("cost", "Giá vốn đang giữ"),
          money("value", "Giá trị tài sản đang giữ"),
          money("cash", "Tiền chờ"),
          money("total", "Tổng giá trị"),
          money("profit", "Lãi/lỗ phần đang giữ"),
          text("date", "Ngày định giá"),
        ],
        rows: report.portfolios.map((r) => ({
          id: r.id,
          name: r.name,
          cost: r.cost,
          value: r.value,
          cash: r.cash,
          total: r.total,
          profit: r.unrealized,
          date: r.valueDate,
        })),
      });
    if (report.after.missing.length)
      result.warnings.push("Đầu tư thiếu định giá; chưa đủ dữ liệu tính tổng.");
    if (assets.some((r) => r.stale))
      result.warnings.push("Đầu tư đang dùng định giá cũ.");
  } else if (source === "funds") {
    const book = books.funds ?? null,
      before = fundsAt(book, previousDate(p.from)),
      after = fundsAt(book, p.asOf),
      atEnd = fundBookAt(book, p.asOf);
    const config = atEnd?.configurations.at(-1);
    const populated = Boolean(config || atEnd?.revisions.length);
    const transactions = book
      ? activeTransactions(book).filter(({ transaction: t }) =>
          inPeriod(vietnamClock(new Date(t.occurredAt)).today, p),
        )
      : [];
    metric(
      "value",
      "Quỹ an toàn cuối kỳ",
      populated ? after.total : null,
      () =>
        populated
          ? after.funds.map((f) =>
              row(f.id, p.asOf, f.id, "Quỹ an toàn", f.balance),
            )
          : [],
    );
    metric(
      "opening",
      "Quỹ an toàn đầu kỳ",
      populated ? before.total : null,
      () =>
        populated
          ? before.funds.map((f) =>
              row(f.id, previousDate(p.from), f.id, "Quỹ an toàn", f.balance),
            )
          : [],
    );
    for (const [id, kind, label] of [
      ["inflow", "deposit", "Góp vào quỹ"],
      ["outflow", "withdraw", "Rút khỏi quỹ"],
    ] as const) {
      const rows = transactions
        .filter(({ transaction: t }) => t.kind === kind)
        .map(({ transaction: t }) =>
          row(
            t.id,
            vietnamClock(new Date(t.occurredAt)).today,
            t.fundId,
            label,
            t.amount,
            t.note,
          ),
        );
      metric(
        id,
        label,
        populated ? sumMoney(rows.map((r) => r.amount!)) : null,
        () => rows,
      );
    }
    if (!detailOnly)
      result.tables.push({
        id: "funds.balances",
        title: "Tiến độ Quỹ an toàn cuối kỳ",
        columns: [
          text("name", "Quỹ"),
          money("opening", "Số dư đầu kỳ"),
          money("value", "Số dư cuối kỳ"),
          money("target", "Mục tiêu cuối kỳ"),
          { key: "percent", label: "Tiến độ %", type: "percent" },
        ],
        rows: populated
          ? after.funds.map((f) => ({
              id: f.id,
              name: f.id,
              opening: before.funds.find((b) => b.id === f.id)!.balance,
              value: f.balance,
              target: config ? f.target : null,
              percent: config ? f.percent : null,
            }))
          : [],
      });
    if (!detailOnly)
      result.tables.push({
        id: "funds.transactions",
        title: "Giao dịch Quỹ an toàn",
        columns: detailColumns,
        rows: transactions.map(({ transaction: t }) =>
          row(
            t.id,
            vietnamClock(new Date(t.occurredAt)).today,
            t.fundId,
            {
              opening: "Số dư ban đầu",
              deposit: "Góp vào quỹ",
              withdraw: "Rút khỏi quỹ",
              transfer: "Chuyển nội bộ",
            }[t.kind],
            t.amount,
            t.kind === "transfer"
              ? `${t.fundId} → ${t.toFundId}; ${t.note}`
              : t.note,
          ),
        ),
      });
    const months: Row[] = [];
    for (
      let month = p.from.slice(0, 7);
      !detailOnly && month <= p.asOf.slice(0, 7);
      month = nextMonth(month)
    ) {
      const end = new Date(
        Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
      )
        .toISOString()
        .slice(0, 10);
      const atMonthEnd = fundBookAt(book, end < p.asOf ? end : p.asOf);
      const exists = Boolean(
        atMonthEnd?.configurations.length || atMonthEnd?.revisions.length,
      );
      months.push({
        id: month,
        month,
        value: exists ? fundsAt(book, end < p.asOf ? end : p.asOf).total : null,
      });
    }
    if (!detailOnly)
      result.tables.push({
        id: "funds.months",
        title: "Quỹ an toàn theo tháng",
        columns: [text("month", "Tháng"), money("value", "Số dư cuối tháng")],
        rows: months,
      });
  } else {
    const sources: GoalSources = {
      versions: { savings: 0, investments: 0, funds: 0 },
      items: [],
    };
    for (const id of ["savings", "investments", "funds"] as const) {
      if (input.errors.includes(id)) {
        sources.versions[id] = null;
        continue;
      }
      try {
        const source = goalSources(
          {
            savings: id === "savings" ? (books.savings ?? null) : null,
            investments:
              id === "investments" ? (books.investments ?? null) : null,
            funds: id === "funds" ? (books.funds ?? null) : null,
          },
          clock.today,
        );
        sources.versions[id] = source.versions[id];
        sources.items.push(...source.items);
      } catch {
        sources.versions[id] = null;
        result.unavailable.push(id);
      }
    }
    const view = goalView(books.goals ?? null, sources, clock);
    const rows = (books.goals?.goals ?? []).map((g) => {
      const state = view.states.find((s) => s.id === g.id)!;
      return {
        id: g.id,
        name: g.name,
        value: state.current,
        target: g.target,
        remaining: state.remaining,
        percent: state.percent,
        status: {
          active: "Đang thực hiện",
          paused: "Tạm dừng",
          completed: "Hoàn thành",
          archived: "Đã lưu trữ",
        }[g.status],
        deadline: g.deadline,
        note:
          state.current === null
            ? "Thiếu dữ liệu nguồn"
            : state.stale
              ? "Định giá cũ"
              : "",
        mode: g.mode === "linked" ? "Nguồn liên kết" : "Sổ riêng",
      };
    });
    if (!detailOnly)
      result.tables.push({
        id: "goals.current",
        title: "Mục tiêu hiện tại",
        columns: [
          text("name", "Mục tiêu"),
          money("value", "Đã đạt"),
          money("target", "Số tiền đích"),
          money("remaining", "Còn thiếu"),
          { key: "percent", label: "Tiến độ %", type: "percent" },
          text("status", "Trạng thái"),
          text("deadline", "Hạn"),
          text("mode", "Cách ghi nhận"),
          text("note", "Ghi chú"),
        ],
        rows,
      });
  }
  return result;
}

export interface ReportBuildOptions {
  details?: boolean;
  tables?: boolean;
  metric?: string;
}

export function detailSources(query: ReportQuery, metric: string): SourceId[] {
  if (
    metric === "cashflow.difference" &&
    ["summary", "cashflow"].includes(query.tab)
  )
    return ["income", "expenses"];
  const source = metric.split(".")[0] as SourceId;
  if (!reportSources(query.tab).includes(source) || source === "goals")
    throw new ReportError(
      "Không tìm thấy số liệu báo cáo.",
      404,
      "REPORT_NOT_FOUND",
    );
  return [source];
}

export function buildReport(
  input: ReportInput,
  query: ReportQuery,
  clock: Clock,
  options: ReportBuildOptions = {},
) {
  const selectedSources = options.metric
    ? detailSources(query, options.metric)
    : null;
  const period = periodFor(query, clock),
    previousPeriod = periodFor(query, clock, true);
  const report: Report = {
    query,
    period,
    previousPeriod,
    generatedAt: clock.now,
    versions: "",
    sources: {},
    warnings: [],
    metrics: [],
    tables: [],
  };
  const details: Record<string, Row[]> = {};
  const unavailable = new Set(input.errors);
  for (const source of reportSources(query.tab)) {
    const book = input.books[source];
    report.sources[source] = {
      status: unavailable.has(source) ? "error" : "ready",
      empty: !book,
      version: book?.version ?? 0,
    };
    if (
      unavailable.has(source) ||
      (selectedSources && !selectedSources.includes(source)) ||
      (query.tab === "goals" && source !== "goals")
    )
      continue;
    try {
      const effective =
        period.future && source !== "goals"
          ? { ...period, from: clock.today, to: clock.today, asOf: clock.today }
          : period;
      const current = buildSource(
        source,
        { ...input, errors: [...unavailable] },
        effective,
        clock,
        options,
      );
      for (const failed of current.unavailable) {
        unavailable.add(failed);
        report.sources[failed] = {
          status: "error",
          empty: false,
          version: null,
        };
      }
      const previous =
        Boolean(options.metric) ||
        source === "goals" ||
        period.future ||
        previousPeriod.from < "2000-01-01"
          ? null
          : buildSource(source, input, previousPeriod, clock, {
              details: false,
              tables: false,
            });
      report.warnings.push(...current.warnings);
      if (previous?.warnings.length)
        report.warnings.push(
          "Kỳ trước có dữ liệu chưa đầy đủ, tạm tính hoặc định giá cũ; cần xem xét khi so sánh.",
        );
      if (period.future && source !== "goals") {
        current.tables = [];
        for (const m of current.metrics) {
          m.value = null;
          current.details[m.id] = [];
        }
      }
      for (const m of current.metrics) {
        const prior = period.future
          ? null
          : (previous?.metrics.find((v) => v.id === m.id)?.value ?? null);
        const delta =
          m.value !== null && prior !== null
            ? (BigInt(m.value) - BigInt(prior)).toString()
            : null;
        const percent = changePercent(m.value, prior);
        report.metrics.push({ ...m, previous: prior, delta, percent });
      }
      report.tables.push(...current.tables);
      Object.assign(details, current.details);
    } catch {
      unavailable.add(source);
      report.sources[source] = { status: "error", empty: false, version: null };
    }
  }
  const income = report.metrics.find((m) => m.id === "income.total"),
    expense = report.metrics.find((m) => m.id === "expenses.spent");
  if (income && expense) {
    const difference = (a: Cell, b: Cell) =>
      a === null || b === null ? null : (BigInt(a) - BigInt(b)).toString();
    const value = difference(income.value, expense.value),
      previous = difference(income.previous, expense.previous);
    report.metrics.splice(1, 0, {
      id: "cashflow.difference",
      label: "Chênh lệch theo sổ",
      source: "income",
      value,
      previous,
      delta: difference(value, previous),
      percent: changePercent(value, previous),
    });
    if (options.details !== false)
      details["cashflow.difference"] = [
        ...(details["income.total"] ?? []),
        ...(details["expenses.spent"] ?? []).map((r) => ({
          ...r,
          amount: r.amount === null ? null : (-BigInt(r.amount)).toString(),
        })),
      ];
  }
  if (query.tab === "summary") {
    report.metrics = report.metrics.filter((m) =>
      [
        "income.total",
        "expenses.spent",
        "cashflow.difference",
        "savings.value",
        "investments.value",
        "funds.value",
      ].includes(m.id),
    );
    report.tables = report.tables.filter(
      (t) =>
        t.id.endsWith(".months") ||
        t.id === "expenses.date" ||
        t.id === "goals.current",
    );
  }
  if (query.tab === "summary" || query.tab === "cashflow") {
    const order = [
      "income.total",
      "expenses.spent",
      "cashflow.difference",
      "income.fixed",
      "income.oneoff",
      "expenses.funding",
      "savings.value",
      "investments.value",
      "funds.value",
    ];
    report.metrics.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  report.warnings = [...new Set(report.warnings)];
  const ordered = (a: Row, b: Row) =>
    String(a.date ?? a.month ?? a.id).localeCompare(
      String(b.date ?? b.month ?? b.id),
    ) || a.id.localeCompare(b.id);
  for (const table of report.tables) table.rows.sort(ordered);
  for (const rows of Object.values(details)) rows.sort(ordered);
  report.versions = JSON.stringify({
    generation: input.generation,
    today: clock.today,
    asOf: period.asOf,
    query,
    sources: Object.fromEntries(
      Object.entries(report.sources).map(([key, s]) => [
        key,
        [s.status, s.version],
      ]),
    ),
  });
  return { report, details };
}

export function reportDetails(
  result: ReturnType<typeof buildReport>,
  metric: string,
  expected: string,
  page: number,
) {
  if (result.report.versions !== expected)
    throw new ReportError(
      "Nguồn số liệu đã thay đổi. Cập nhật báo cáo để xem chi tiết mới.",
      409,
      "REPORT_CHANGED",
    );
  const rows = result.details[metric];
  if (!rows)
    throw new ReportError(
      "Không tìm thấy số liệu báo cáo.",
      404,
      "REPORT_NOT_FOUND",
    );
  return {
    rows: rows.slice((page - 1) * 20, page * 20),
    columns: detailColumns,
    total: rows.length,
    page,
    label: result.report.metrics.find((m) => m.id === metric)?.label ?? metric,
  };
}
