import { actionSchema, type SavingsAction } from "./schema";
import type { Clock, SavingsBook, SavingsView } from "./types";
import { endOfMonth, nextMonth } from "../shared/dates";
import {
  fail,
  quantity,
  ruleAt,
  activeTransactions,
  closedMonths,
  ensureOpen,
  emptyBook,
} from "./model";

import { replay } from "./replay";
export { replay } from "./replay";
export {
  SavingsError,
  scale,
  quantity,
  quantityText,
  roundedValue,
  ruleAt,
  activeTransactions,
  closedMonths,
  emptyBook,
} from "./model";
export { savingsClock } from "../shared/clock";
export { endOfMonth, previousDate, nextMonth } from "../shared/dates";
/** Validate and apply commands; calculations live in replay. */
export function applyAction(
  input: SavingsBook | null,
  raw: SavingsAction,
  clock: Clock,
): SavingsBook {
  const action = actionSchema.parse(raw),
    book = structuredClone(input ?? emptyBook()),
    seq = book.version + 1;
  function cat(id: string) {
    return (
      book.categories.find((c) => c.id === id) ??
      fail("Danh mục không tồn tại.")
    );
  }
  function dateAllowed(date: string) {
    if (date > clock.today)
      fail("Không ghi giao dịch hoặc giá trong tương lai.");
    ensureOpen(book, date.slice(0, 7));
  }
  switch (action.type) {
    case "createCategory":
      ensureOpen(book, action.start);
      if (book.categories.some((c) => c.id === action.id))
        fail("Mã danh mục đã tồn tại.");
      if (action.kind === "gold" && !action.unit) fail("Cần chọn đơn vị vàng.");
      if (action.kind !== "gold" && action.unit)
        fail("Chỉ vàng có đơn vị số lượng.");
      book.categories.push({
        id: action.id,
        start: action.start,
        kind: action.kind,
        unit: action.unit,
        rules: [
          {
            month: action.start,
            name: action.name,
            description: action.description,
            emoji: action.emoji,
            active: true,
          },
        ],
      });
      break;
    case "configureCategory":
    case "archiveCategory":
    case "restoreCategory": {
      ensureOpen(book, action.month);
      const c = cat(action.categoryId);
      if (action.month < c.start) fail("Tháng hiệu lực trước tháng bắt đầu.");
      const old = ruleAt(c, action.month)!;
      const r = {
        ...old,
        month: action.month,
        ...(action.type === "configureCategory"
          ? {
              name: action.name,
              description: action.description,
              emoji: action.emoji,
            }
          : { active: action.type === "restoreCategory" }),
      };
      if (action.type === "archiveCategory") {
        const state = replay(book, endOfMonth(action.month)),
          p = state.positions.find((p) => p.id === c.id)!;
        if (
          BigInt(p.cost) !== 0n ||
          quantity(p.quantity) !== 0n ||
          state.contracts.some(
            (x) => x.categoryId === c.id && BigInt(x.principal) > 0n,
          )
        )
          fail("Cần rút, chuyển hoặc bán hết tài sản trước khi lưu trữ.");
      }
      c.rules = c.rules.filter((x) => x.month !== action.month);
      c.rules.push(r);
      c.rules.sort((a, b) => a.month.localeCompare(b.month));
      break;
    }
    case "postTransaction": {
      const t = action.transaction;
      dateAllowed(t.date);
      if (book.revisions.some((r) => r.rootId === t.id))
        fail("Mã giao dịch đã tồn tại.");
      if (t.kind.startsWith("opening")) {
        const affected = activeTransactions(book).filter(
          (r) =>
            r.transaction.categoryId === t.categoryId ||
            ("cashCategoryId" in r.transaction &&
              r.transaction.cashCategoryId === t.categoryId),
        );
        if (
          affected.some((r) => r.transaction.date < t.date) ||
          affected.some(
            (r) =>
              r.transaction.kind.startsWith("opening") &&
              r.transaction.date !== t.date,
          )
        )
          fail("Số mở đầu phải cùng ngày và trước mọi giao dịch của danh mục.");
      }
      book.revisions.push({
        id: t.id,
        rootId: t.id,
        sequence: seq,
        transaction: t,
        reason: "",
      });
      break;
    }
    case "reviseTransaction": {
      const old =
        activeTransactions(book).find(
          (r) => r.transaction.id === action.transactionId,
        )?.transaction ?? fail("Giao dịch không còn hiệu lực.");
      dateAllowed(old.date);
      if (action.replacement) {
        dateAllowed(action.replacement.date);
        if (action.replacement.id !== old.id)
          fail("Giao dịch thay thế phải giữ mã gốc.");
      }
      book.revisions.push({
        id: `${old.id}:${seq}`,
        rootId: old.id,
        sequence: seq,
        transaction: action.replacement,
        reason: action.reason,
      });
      break;
    }
    case "setPrice":
      dateAllowed(action.date);
      if (cat(action.categoryId).kind !== "gold")
        fail("Chỉ cập nhật giá cho vàng.");
      if (book.prices.some((p) => p.id === action.id))
        fail("Mã giá đã tồn tại.");
      book.prices.push({
        id: action.id,
        categoryId: action.categoryId,
        date: action.date,
        price: action.price,
        sequence: seq,
      });
      break;
    case "closeMonth": {
      if (action.month >= clock.today.slice(0, 7))
        fail("Chỉ chốt tháng đã kết thúc.");
      const closed = closedMonths(book),
        first = book.categories.map((c) => c.start).sort()[0];
      if (!first) fail("Chưa có danh mục.");
      let expected = first;
      while (closed.includes(expected)) expected = nextMonth(expected);
      if (action.month !== expected) fail(`Cần chốt tháng ${expected} trước.`);
      const state = replay(book, endOfMonth(action.month));
      if (state.missing.length)
        fail("Cần nhập giá cho tất cả vàng đang giữ trước khi chốt.");
      if (!action.acceptStalePrices && state.positions.some((p) => p.stale))
        fail("Cần xác nhận sử dụng giá từ tháng trước.");
      book.closes.push({
        id: `${action.month}:${seq}`,
        sequence: seq,
        month: action.month,
        kind: "close",
        reason: "",
        snapshot: state,
      });
      break;
    }
    case "reopenMonth":
      if (!closedMonths(book).includes(action.month))
        fail("Tháng chưa được chốt.");
      book.closes.push({
        id: `${action.month}:${seq}`,
        sequence: seq,
        month: action.month,
        kind: "reopen",
        reason: action.reason,
        snapshot: null,
      });
      break;
  }
  const live = activeTransactions(book).map((r) => r.transaction);
  for (const c of book.categories) {
    const linked = live.filter(
      (t) =>
        t.categoryId === c.id ||
        ("cashCategoryId" in t && t.cashCategoryId === c.id),
    );
    const openings = linked.filter(
      (t) => t.categoryId === c.id && t.kind.startsWith("opening"),
    );
    if (
      (openings.length && linked.some((t) => t.date < openings[0].date)) ||
      openings.some((t) => t.date !== openings[0].date)
    )
      fail("Số mở đầu phải cùng ngày và trước mọi giao dịch của danh mục.");
  }
  // Full replay validates downstream balances and links even for a historical edit.
  replay(book, clock.today);
  // Archived categories may have old transactions in that month; never allow a hidden residual.
  for (const c of book.categories)
    for (const r of c.rules.filter(
      (r) => !r.active && r.month <= clock.today.slice(0, 7),
    )) {
      const p = replay(book, endOfMonth(r.month)).positions.find(
        (p) => p.id === c.id,
      );
      if (p && (BigInt(p.cost) !== 0n || quantity(p.quantity) !== 0n))
        fail("Danh mục lưu trữ vẫn còn tài sản.");
    }
  book.version = seq;
  book.audit.push({ version: seq, at: clock.now, action });
  return book;
}
export function toView(
  book: SavingsBook | null,
  asOf: string,
  clock: Clock,
): SavingsView {
  const date = asOf > clock.today ? clock.today : asOf;
  const state = replay(book ?? emptyBook(), date);
  const until = new Date(`${clock.today}T00:00:00Z`).valueOf() + 7 * 86400000;
  const current = replay(book ?? emptyBook(), clock.today);
  return {
    book,
    state,
    today: clock.today,
    month: asOf.slice(0, 7),
    closed: book ? closedMonths(book) : [],
    due: current.contracts.filter(
      (c) =>
        BigInt(c.principal) > 0n &&
        new Date(`${c.maturity}T00:00:00Z`).valueOf() <= until,
    ),
  };
}
