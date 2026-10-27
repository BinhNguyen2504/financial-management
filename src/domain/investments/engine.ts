import { actionSchema, type InvestmentAction } from "./schema";
import type { Clock, InvestmentBook, InvestmentView } from "./types";
import { fail, emptyBook, ruleAt, activeTransactions } from "./model";

import { replay } from "./replay";
export { replay } from "./replay";
export {
  InvestmentError,
  emptyBook,
  ruleAt,
  activeTransactions,
} from "./model";
export { endOfMonth, previousDate, nextMonth } from "../shared/dates";
export { savingsClock as investmentClock } from "../shared/clock";
/** Validate and apply commands; calculations live in replay. */
export function applyAction(
  input: InvestmentBook | null,
  raw: InvestmentAction,
  clock: Clock,
): InvestmentBook {
  const action = actionSchema.parse(raw),
    book = structuredClone(input ?? emptyBook()),
    seq = book.version + 1;
  const cat = (id: string) =>
    book.categories.find((c) => c.id === id) ?? fail("Danh mục không tồn tại.");
  const dateAllowed = (date: string) => {
    if (date > clock.today) fail("Không ghi dữ liệu trong tương lai.");
  };
  switch (action.type) {
    case "createCategory":
      dateAllowed(action.start);
      if (book.categories.some((c) => c.id === action.id))
        fail("Mã danh mục đã tồn tại.");
      book.categories.push({
        id: action.id,
        start: action.start,
        kind: action.kind,
        rules: [
          {
            date: action.start,
            sequence: seq,
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
      const c = cat(action.categoryId);
      dateAllowed(action.date);
      if (action.date < c.start) fail("Ngày hiệu lực trước ngày bắt đầu.");
      const old = ruleAt(c, action.date)!;
      if (action.type === "configureCategory") {
        if (
          action.kind !== c.kind &&
          book.revisions.some(
            (r) =>
              r.transaction &&
              (r.transaction.categoryId === c.id ||
                ("cashCategoryId" in r.transaction &&
                  r.transaction.cashCategoryId === c.id)),
          )
        )
          fail("Không đổi loại danh mục đã có phát sinh.");
        c.kind = action.kind;
      }
      c.rules.push({
        ...old,
        date: action.date,
        sequence: seq,
        ...(action.type === "configureCategory"
          ? {
              name: action.name,
              emoji: action.emoji,
              description: action.description,
            }
          : { active: action.type === "restoreCategory" }),
      });
      break;
    }
    case "postTransaction": {
      const t = action.transaction;
      dateAllowed(t.date);
      cat(t.categoryId);
      if (book.revisions.some((r) => r.rootId === t.id))
        fail("Mã giao dịch đã tồn tại.");
      book.revisions.push({
        id: t.id,
        rootId: t.id,
        sequence: seq,
        at: clock.now,
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
      if (action.replacement) {
        dateAllowed(action.replacement.date);
        if (
          action.replacement.id !== old.id ||
          action.replacement.kind !== old.kind
        )
          fail("Bản sửa phải giữ mã và loại giao dịch gốc.");
      }
      book.revisions.push({
        id: `${old.id}:${seq}`,
        rootId: old.id,
        sequence: seq,
        at: clock.now,
        transaction: action.replacement,
        reason: action.reason,
      });
      break;
    }
  }
  const live = activeTransactions(book);
  for (const c of book.categories) {
    const linked = live.filter(
      (r) =>
        r.transaction.categoryId === c.id ||
        ("cashCategoryId" in r.transaction &&
          r.transaction.cashCategoryId === c.id),
    );
    const openings = linked.filter((r) =>
      r.transaction.kind.startsWith("opening"),
    );
    if (openings.length > 1) fail("Mỗi danh mục chỉ có một số dư mở đầu.");
    if (openings.length) {
      const o = openings[0];
      if (
        o.transaction.date !== c.start ||
        linked.some(
          (r) =>
            r.transaction.date < o.transaction.date ||
            (r.transaction.date === o.transaction.date &&
              r.sequence < o.sequence),
        )
      )
        fail(
          "Số mở đầu phải ở ngày bắt đầu, trước mọi phát sinh của danh mục.",
        );
    }
  }
  replay(book, clock.today);
  for (const c of book.categories)
    for (const r of c.rules.filter((r) => !r.active)) {
      const p = replay(book, r.date, r.sequence).positions.find(
        (p) => p.id === c.id,
      )!;
      if (
        p.kind === "cash"
          ? BigInt(p.cash) !== 0n
          : BigInt(p.cost) !== 0n || p.value === null || BigInt(p.value) !== 0n
      )
        fail(
          "Cần hết giá vốn và giá trị tài sản, hoặc hết tiền ví, trước khi xóa/lưu trữ.",
        );
    }
  book.version = seq;
  book.audit.push({ version: seq, at: clock.now, action });
  return book;
}
export function toView(
  book: InvestmentBook | null,
  asOf: string,
  clock: Clock,
): InvestmentView {
  return {
    book,
    state: replay(book ?? emptyBook(), asOf > clock.today ? clock.today : asOf),
    today: clock.today,
    month: asOf.slice(0, 7),
  };
}
