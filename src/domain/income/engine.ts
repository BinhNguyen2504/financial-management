import { incomeActionSchema, yearSchema, type IncomeAction } from "./schema";
import { nameKey, nameTaken } from "../shared/names";
import type { Clock, IncomeBook, IncomeCategory, IncomeView } from "./types";
export class IncomeError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_ACTION",
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export { incomeClock } from "../shared/clock";

/** Rules written before the receive day existed prompt from day 1. */
export const DEFAULT_RECEIVE_DAY = 1;

/** Last calendar day of a `YYYY-MM` month (month lengths do not depend on locale). */
function daysInMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}
/** Day the money is expected in `month`; 29-31 fall back to the month's last day. */
export function incomeDueDay(month: string, receiveDay: number) {
  return Math.min(receiveDay, daysInMonth(month));
}
/**
 * A fixed row is "due" (may be reminded) from its receive day onward: past
 * months are always due, the current month from the receive day, later
 * months never. `today` is `YYYY-MM-DD` in Vietnam time.
 */
export function isIncomeDue(
  row: { month: string; receiveDay: number },
  today: string,
) {
  const current = today.slice(0, 7);
  if (row.month < current) return true;
  if (row.month > current) return false;
  return Number(today.slice(8, 10)) >= incomeDueDay(row.month, row.receiveDay);
}

export function ruleAt(category: IncomeCategory, month: string) {
  return category.rules
    .filter((r) => r.month <= month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
}
/**
 * A new or renamed source may not reuse the name of another source that is
 * not deleted, including stopped ones that still appear in history. Names are
 * compared as they read in the effective month (the first of `months`) and in
 * the current month, plus every later start or rename, even a future one.
 * Only the actions that set a name call this, so older duplicates stay readable
 * and editable.
 */
function ensureUniqueName(
  book: IncomeBook,
  name: string,
  months: string[],
  exceptId?: string,
) {
  const taken = book.categories
    .filter((c) => !c.deleted && c.id !== exceptId)
    .flatMap((c) => [
      ...months.map((m) => ruleAt(c, m)?.name),
      ...c.rules.filter((r) => r.month > months[0]).map((r) => r.name),
    ]);
  if (nameTaken(name, taken)) {
    const message = "Tên nguồn thu đã tồn tại.";
    throw new IncomeError(message, 422, "DUPLICATE_NAME", { name: message });
  }
}
/** Existing receipts across every month/year, including an explicit zero. */
export function hasMonthlyIncome(
  book: IncomeBook,
  categoryId: string,
): boolean {
  return book.monthly.some((r) => r.categoryId === categoryId);
}
export function applyAction(
  source: IncomeBook | null,
  input: IncomeAction,
  clock: Clock,
): IncomeBook {
  const action = incomeActionSchema.parse(input);
  const book: IncomeBook = structuredClone(
    source ?? {
      version: 0,
      categories: [],
      monthly: [],
      oneOffs: [],
      audit: [],
    },
  );
  const current = clock.today.slice(0, 7);
  const category =
    "categoryId" in action
      ? book.categories.find((c) => c.id === action.categoryId && !c.deleted)
      : undefined;
  if ("categoryId" in action && !category)
    throw new IncomeError("Không tìm thấy danh mục.", 404, "NOT_FOUND");
  if ("month" in action && category && action.month < category.start)
    throw new IncomeError("Tháng phải từ tháng bắt đầu danh mục.");
  switch (action.type) {
    case "createCategory": {
      if (book.categories.some((c) => c.id === action.id))
        throw new IncomeError("Danh mục đã tồn tại.", 409);
      ensureUniqueName(book, action.name, [action.start, current]);
      book.categories.push({
        id: action.id,
        start: action.start,
        deleted: false,
        rules: [
          {
            month: action.start,
            name: action.name,
            description: action.description,
            active: true,
            ...(action.receiveDay === undefined
              ? {}
              : { receiveDay: action.receiveDay }),
          },
        ],
      });
      break;
    }
    case "configureCategory": {
      const previous = ruleAt(category!, action.month);
      if (!previous?.active)
        throw new IncomeError(
          "Danh mục đã ngừng ở tháng này. Chọn tháng trước khi ngừng.",
        );
      if (nameKey(action.name) !== nameKey(previous.name))
        ensureUniqueName(
          book,
          action.name,
          [action.month, current],
          category!.id,
        );
      category!.rules = category!.rules.filter((r) => r.month !== action.month);
      const receiveDay = action.receiveDay ?? previous.receiveDay;
      category!.rules.push({
        month: action.month,
        name: action.name,
        description: action.description,
        active: true,
        ...(receiveDay === undefined ? {} : { receiveDay }),
      });
      break;
    }
    case "stopCategory": {
      const previous = ruleAt(category!, action.month)!;
      // Keep later historical names, but no later rule may restart the monthly prompts.
      category!.rules = category!.rules
        .filter((r) => r.month !== action.month)
        .map((r) => (r.month > action.month ? { ...r, active: false } : r));
      category!.rules.push({ ...previous, month: action.month, active: false });
      break;
    }
    case "deleteCategory": {
      if (hasMonthlyIncome(book, category!.id))
        throw new IncomeError(
          "Danh mục đã có số thu. Hãy chọn Ngừng từ tháng để giữ lịch sử.",
        );
      category!.deleted = true;
      break;
    }
    case "setMonthly": {
      if (action.month > current)
        throw new IncomeError(
          "Chỉ ghi thực nhận ở tháng hiện tại hoặc quá khứ.",
        );
      const existing = book.monthly.find(
        (r) => r.categoryId === action.categoryId && r.month === action.month,
      );
      if (!existing && !ruleAt(category!, action.month)?.active)
        throw new IncomeError("Danh mục đã ngừng ở tháng này.");
      book.monthly = book.monthly.filter((r) => r !== existing);
      book.monthly.push({
        categoryId: action.categoryId,
        month: action.month,
        amount: action.amount,
        note: action.note,
      });
      break;
    }
    case "clearMonthly": {
      if (
        !book.monthly.some(
          (r) => r.categoryId === action.categoryId && r.month === action.month,
        )
      )
        throw new IncomeError("Chưa có số thu để xóa.", 404);
      book.monthly = book.monthly.filter(
        (r) => r.categoryId !== action.categoryId || r.month !== action.month,
      );
      break;
    }
    case "upsertOneOff": {
      if (action.month > current)
        throw new IncomeError(
          "Chỉ ghi thực nhận ở tháng hiện tại hoặc quá khứ.",
        );
      const existing = book.oneOffs.find((r) => r.id === action.id);
      if (existing?.deleted) throw new IncomeError("Khoản thu đã bị xóa.", 409);
      book.oneOffs = book.oneOffs.filter((r) => r.id !== action.id);
      book.oneOffs.push({
        id: action.id,
        month: action.month,
        name: action.name,
        description: action.description,
        amount: action.amount,
        deleted: false,
      });
      break;
    }
    case "deleteOneOff": {
      const row = book.oneOffs.find((r) => r.id === action.id && !r.deleted);
      if (!row) throw new IncomeError("Không tìm thấy khoản thu.", 404);
      row.deleted = true;
      break;
    }
  }
  book.version++;
  const before = !source
    ? null
    : "categoryId" in action
      ? {
          category: source.categories.find((c) => c.id === action.categoryId),
          monthly: source.monthly.filter(
            (r) =>
              r.categoryId === action.categoryId &&
              (!("month" in action) || r.month === action.month),
          ),
        }
      : "id" in action
        ? (source.oneOffs.find((r) => r.id === action.id) ?? null)
        : null;
  book.audit.push({
    version: book.version,
    at: clock.now,
    action: action.type,
    detail: { action, before },
  });
  return book;
}
export function toView(
  book: IncomeBook | null,
  year: number,
  clock: Clock,
  onlyMonth?: string,
): IncomeView {
  yearSchema.parse(year);
  const rows: IncomeView["rows"] = [];
  if (book) {
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, "0")}`;
      if (onlyMonth && month !== onlyMonth) continue;
      for (const category of book.categories.filter((c) => !c.deleted)) {
        const rule = ruleAt(category, month);
        const value = book.monthly.find(
          (r) => r.categoryId === category.id && r.month === month,
        );
        if (!rule || (!rule.active && !value)) continue;
        rows.push({
          key: category.id,
          categoryId: category.id,
          kind: "fixed",
          month,
          name: rule.name,
          description: rule.description,
          amount: value?.amount ?? null,
          note: value?.note ?? "",
          active: rule.active,
          receiveDay: rule.receiveDay ?? DEFAULT_RECEIVE_DAY,
        });
      }
    }
    for (const row of book.oneOffs.filter(
      (r) =>
        !r.deleted &&
        r.month.startsWith(`${year}-`) &&
        (!onlyMonth || r.month === onlyMonth),
    ))
      rows.push({
        key: row.id,
        categoryId: null,
        kind: "oneoff",
        month: row.month,
        name: row.name,
        description: row.description,
        amount: row.amount,
        note: "",
        active: true,
        receiveDay: DEFAULT_RECEIVE_DAY,
      });
  }
  return { book, rows, year, today: clock.today };
}
