import type { Locale } from "@/i18n/locale";
import { translator } from "@/i18n/translate";
import { z } from "zod";
import {
  emptyBook,
  endOfMonth,
  InvestmentError,
  nextMonth,
  previousDate,
  replay,
} from "./engine";
import { dateSchema, kindSchema, transactionSchema } from "./schema";
import type {
  Clock,
  InvestmentBook,
  InvestmentState,
  TransactionEffect,
} from "./types";
export const reportFilterSchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    categoryId: z.uuid().optional(),
    kind: kindSchema.optional(),
    transactionKind: z
      .enum(
        transactionSchema.options.map((o) => o.shape.kind.value) as [
          string,
          ...string[],
        ],
      )
      .optional(),
  })
  .refine((v) => v.from <= v.to, "Khoảng thời gian không hợp lệ.");
export type ReportFilter = z.infer<typeof reportFilterSchema>;
const sum = (v: string[]) => v.reduce((n, x) => n + BigInt(x), 0n).toString();
export function buildReport(
  input: InvestmentBook | null,
  raw: ReportFilter,
  clock: Clock,
) {
  const filter = reportFilterSchema.parse(raw),
    book = input ?? emptyBook();
  if (filter.from > clock.today)
    throw new InvestmentError("Ngày bắt đầu báo cáo chưa diễn ra.");
  const asOf = filter.to > clock.today ? clock.today : filter.to;
  const ids = new Set(
    book.categories
      .filter(
        (c) =>
          (!filter.categoryId || c.id === filter.categoryId) &&
          (!filter.kind || c.kind === filter.kind),
      )
      .map((c) => c.id),
  );
  function selected(state: InvestmentState) {
    const positions = state.positions.filter((p) => ids.has(p.id));
    const missing = positions.filter((p) => p.value === null).map((p) => p.id);
    const knownValue = sum(positions.map((p) => p.value ?? "0"));
    return {
      ...state,
      positions,
      knownValue,
      total: missing.length ? null : knownValue,
      missing,
    };
  }
  const before = selected(replay(book, previousDate(filter.from))),
    after = selected(replay(book, asOf));
  const effects = after.effects.filter(
    (e) =>
      e.date >= filter.from &&
      e.date <= asOf &&
      (ids.has(e.categoryId) ||
        (!!e.cashCategoryId && ids.has(e.cashCategoryId))) &&
      (!filter.transactionKind || e.kind === filter.transactionKind),
  );
  // Transaction filters select activity, never erase holdings or the transfers needed to reconcile them.
  const allEffects = after.effects.filter(
    (e) => e.date >= filter.from && e.date <= asOf,
  );
  function metrics(rows: TransactionEffect[], subset: Set<string>) {
    const primary = rows.filter((e) => subset.has(e.categoryId));
    const external = sum(primary.map((e) => e.external));
    const internal = sum(
      rows.flatMap((e) =>
        Object.entries(e.internal)
          .filter(([id]) => subset.has(id))
          .map(([, v]) => v),
      ),
    );
    const opening = sum(
      rows.flatMap((e) =>
        Object.entries(e.opening)
          .filter(([id]) => subset.has(id))
          .map(([, v]) => v),
      ),
    );
    return {
      external,
      internal,
      opening,
      inflow: sum(
        primary.filter((e) => BigInt(e.external) > 0n).map((e) => e.external),
      ),
      outflow: sum(
        primary
          .filter((e) => BigInt(e.external) < 0n)
          .map((e) => (-BigInt(e.external)).toString()),
      ),
      realized: sum(primary.map((e) => e.realized)),
      fees: sum(
        primary.map((e) => (BigInt(e.fees) + BigInt(e.tax)).toString()),
      ),
    };
  }
  const activity = metrics(effects, ids),
    reconciliation = metrics(allEffects, ids);
  const result =
    before.total === null || after.total === null
      ? null
      : (
          BigInt(after.total) -
          BigInt(before.total) -
          BigInt(reconciliation.external) -
          BigInt(reconciliation.internal) -
          BigInt(reconciliation.opening)
        ).toString();
  const categories = after.positions.map((p) => {
    const start = before.positions.find((x) => x.id === p.id),
      flows = metrics(allEffects, new Set([p.id]));
    const startValue = start?.value === null ? null : (start?.value ?? "0");
    return {
      ...p,
      realizedTotal: p.realized,
      startValue,
      ...flows,
      result:
        p.value === null || startValue === null
          ? null
          : (
              BigInt(p.value) -
              BigInt(startValue) -
              BigInt(flows.external) -
              BigInt(flows.internal) -
              BigInt(flows.opening)
            ).toString(),
    };
  });
  const months = [];
  for (
    let m = filter.from.slice(0, 7);
    m <= filter.to.slice(0, 7);
    m = nextMonth(m)
  ) {
    if (
      m > clock.today.slice(0, 7) ||
      !book.categories.some(
        (c) => ids.has(c.id) && c.start <= [endOfMonth(m), asOf].sort()[0],
      )
    ) {
      months.push({
        month: m,
        value: null,
        knownValue: null,
        inflow: null,
        outflow: null,
        result: null,
        provisional: false,
        missing: [] as string[],
        valuationDates: [] as {
          name: string;
          date: string | null;
          stale: boolean;
        }[],
      });
      continue;
    }
    const start = `${m}-01` < filter.from ? filter.from : `${m}-01`;
    const end = [endOfMonth(m), asOf].sort()[0];
    const a = selected(replay(book, previousDate(start))),
      b = selected(replay(book, end));
    const f = metrics(
      b.effects.filter((e) => e.date >= start && e.date <= end),
      ids,
    );
    const activityRows = b.effects.filter(
      (e) =>
        e.date >= start &&
        e.date <= end &&
        (!filter.transactionKind || e.kind === filter.transactionKind),
    );
    const visible = metrics(activityRows, ids);
    months.push({
      month: m,
      value: b.total,
      knownValue: b.knownValue,
      inflow: visible.inflow,
      outflow: visible.outflow,
      result:
        a.total === null || b.total === null
          ? null
          : (
              BigInt(b.total) -
              BigInt(a.total) -
              BigInt(f.external) -
              BigInt(f.internal) -
              BigInt(f.opening)
            ).toString(),
      provisional: m === clock.today.slice(0, 7),
      missing: b.missing,
      valuationDates: b.positions
        .filter((p) => p.kind === "investment")
        .map((p) => ({ name: p.name, date: p.valueDate, stale: p.stale })),
    });
  }
  return {
    filter,
    asOf,
    before,
    after,
    categories,
    effects,
    activity,
    reconciliation,
    result,
    months,
    provisional: asOf.slice(0, 7) === clock.today.slice(0, 7),
    activityFiltered: Boolean(filter.transactionKind),
  };
}
export type InvestmentReport = ReturnType<typeof buildReport>;
export function reportCSV(r: InvestmentReport, locale: Locale = "vi") {
  const tr = translator(locale, "errors");

  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      tr("Loại"),
      tr("Ngày"),
      tr("Danh mục / ID"),
      tr("Giá trị đầu kỳ VND"),
      tr("Giá trị cuối kỳ VND"),
      tr("Vốn còn lại VND"),
      tr("Ngày định giá"),
      tr("Kết quả kỳ VND"),
      tr("Nạp ngoài VND"),
      tr("Rút ngoài VND"),
      tr("Chuyển ròng VND"),
      tr("Mở đầu VND"),
      tr("Lãi/lỗ đã chốt kỳ VND"),
      tr("Lãi/lỗ chưa chốt VND"),
      tr("Phí/thuế VND"),
      tr("Ghi chú"),
    ],
  ];
  for (const c of r.categories)
    lines.push([
      tr("Tài sản"),
      r.asOf,
      c.name,
      c.startValue ?? "",
      c.value ?? "",
      c.cost,
      c.valueDate ?? "",
      c.result ?? "",
      c.inflow,
      c.outflow,
      c.internal,
      c.opening,
      c.realized,
      c.unrealized ?? "",
      c.fees,
      c.value === null
        ? tr("Thiếu định giá")
        : c.stale
          ? tr("Định giá từ kỳ trước")
          : "",
    ]);
  for (const m of r.months)
    lines.push([
      tr("Tổng tháng"),
      m.month,
      "",
      "",
      m.value ?? "",
      "",
      "",
      m.result ?? "",
      m.inflow ?? "",
      m.outflow ?? "",
      "",
      "",
      "",
      "",
      "",
      m.provisional ? tr("Tạm tính") : "",
    ]);
  for (const e of r.effects)
    lines.push([
      e.kind,
      e.date,
      e.categoryId,
      "",
      e.net,
      e.costSold,
      "",
      "",
      BigInt(e.external) > 0n ? e.external : "0",
      BigInt(e.external) < 0n ? (-BigInt(e.external)).toString() : "0",
      e.internal[e.categoryId] ?? "0",
      e.opening[e.categoryId] ?? "0",
      e.realized,
      "",
      (BigInt(e.fees) + BigInt(e.tax)).toString(),
      e.note,
    ]);
  lines.push([
    tr("Tổng kỳ"),
    r.asOf,
    "",
    r.before.total ?? "",
    r.after.total ?? "",
    "",
    "",
    r.result ?? "",
    r.activity.inflow,
    r.activity.outflow,
    r.reconciliation.internal,
    r.reconciliation.opening,
    r.activity.realized,
    r.after.total === null
      ? ""
      : sum(r.categories.map((c) => c.unrealized ?? "0")),
    r.activity.fees,
    r.activityFiltered
      ? tr("Lọc giao dịch chỉ áp dụng hoạt động; số dư giữ đầy đủ")
      : "",
  ]);
  return "\uFEFF" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
}
