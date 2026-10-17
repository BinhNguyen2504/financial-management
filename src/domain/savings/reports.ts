import { z } from "zod";
import { dateSchema, kindSchema, transactionSchema } from "./schema";
import {
  emptyBook,
  endOfMonth,
  nextMonth,
  previousDate,
  replay,
  SavingsError,
} from "./engine";
import type {
  Clock,
  SavingsBook,
  SavingsState,
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
  input: SavingsBook | null,
  raw: ReportFilter,
  clock: Clock,
) {
  const filter = reportFilterSchema.parse(raw),
    book = input ?? emptyBook();
  if (filter.from > clock.today)
    throw new SavingsError("Ngày bắt đầu báo cáo chưa diễn ra.");
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
  function selected(state: SavingsState) {
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
      interest: sum(primary.map((e) => e.interest)),
      realized: sum(primary.map((e) => e.realized)),
      fees: sum(primary.map((e) => e.fees)),
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
    if (m > clock.today.slice(0, 7)) {
      months.push({
        month: m,
        value: null,
        knownValue: null,
        inflow: null,
        outflow: null,
        result: null,
        provisional: false,
        missing: [] as string[],
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
export type SavingsReport = ReturnType<typeof buildReport>;
export function reportCSV(r: SavingsReport) {
  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      "Loại",
      "Ngày / tháng",
      "Danh mục / ID",
      "Đầu kỳ VND",
      "Cuối kỳ / giá trị VND",
      "Số lượng",
      "Giá vốn VND",
      "Giá VND/đơn vị",
      "Ngày giá",
      "Nạp ròng / kết quả VND",
      "Ghi chú",
      "Nạp ngoài VND",
      "Rút ngoài VND",
      "Chuyển ròng VND",
      "Vốn mở đầu VND",
      "Lãi nhận VND",
      "Lãi/lỗ đã chốt VND",
      "Lãi/lỗ chưa chốt VND",
      "Phí/thuế VND",
    ],
  ];
  for (const c of r.categories)
    lines.push([
      "Tài sản",
      r.asOf,
      c.name,
      c.startValue ?? "",
      c.value ?? "",
      c.quantity,
      c.cost,
      c.price ?? "",
      c.priceDate ?? "",
      c.result ?? "",
      c.value === null ? "Thiếu định giá" : c.stale ? "Giá từ tháng trước" : "",
      c.inflow,
      c.outflow,
      c.internal,
      c.opening,
      c.interest,
      c.realized,
      c.unrealized ?? "",
      c.fees,
    ]);
  for (const m of r.months)
    lines.push([
      "Tổng tháng",
      m.month,
      "",
      "",
      m.value ?? "",
      "",
      "",
      "",
      "",
      m.result ?? "",
      m.provisional ? "Tạm tính" : m.missing.length ? "Thiếu định giá" : "",
      m.inflow ?? "",
      m.outflow ?? "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  for (const e of r.effects)
    lines.push([
      e.kind,
      e.date,
      e.categoryId,
      "",
      e.net,
      e.quantity,
      e.costSold,
      "",
      "",
      e.external,
      e.note,
      BigInt(e.external) > 0n ? e.external : "0",
      BigInt(e.external) < 0n ? (-BigInt(e.external)).toString() : "0",
      e.internal[e.categoryId] ?? "0",
      e.opening[e.categoryId] ?? "0",
      e.interest,
      e.realized,
      "",
      e.fees,
    ]);
  lines.push([
    "Tổng kỳ",
    r.asOf,
    "",
    r.before.total ?? "",
    r.after.total ?? "",
    "",
    "",
    "",
    "",
    r.result ?? "",
    r.activityFiltered
      ? "Lọc loại giao dịch chỉ áp dụng hoạt động; số dư giữ đầy đủ"
      : "",
    r.activity.inflow,
    r.activity.outflow,
    r.reconciliation.internal,
    r.reconciliation.opening,
    r.activity.interest,
    r.activity.realized,
    r.after.total === null
      ? ""
      : sum(r.categories.map((c) => c.unrealized ?? "0")),
    r.activity.fees,
  ]);
  return "\uFEFF" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
}
