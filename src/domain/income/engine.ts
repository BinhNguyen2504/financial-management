import { incomeActionSchema, yearSchema, type IncomeAction } from "./schema";
import type { Clock, IncomeBook, IncomeCategory, IncomeView } from "./types";
export class IncomeError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_ACTION",
  ) {
    super(message);
  }
}
export function incomeClock(): Clock {
  const now = new Date();
  return {
    today: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
    now: now.toISOString(),
  };
}
export function ruleAt(category: IncomeCategory, month: string) {
  return category.rules
    .filter((r) => r.month <= month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
}
export function hasRecordedIncome(
  book: IncomeBook,
  categoryId: string,
): boolean {
  return (
    book.monthly.some((r) => r.categoryId === categoryId) ||
    book.audit.some((entry) => {
      const action = (entry.detail as { action?: IncomeAction } | null)?.action;
      return action?.type === "setMonthly" && action.categoryId === categoryId;
    })
  );
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
      category!.rules = category!.rules.filter((r) => r.month !== action.month);
      category!.rules.push({
        month: action.month,
        name: action.name,
        description: action.description,
        active: true,
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
      if (hasRecordedIncome(book, category!.id))
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
): IncomeView {
  yearSchema.parse(year);
  const rows: IncomeView["rows"] = [];
  if (book) {
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, "0")}`;
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
        });
      }
    }
    for (const row of book.oneOffs.filter(
      (r) => !r.deleted && r.month.startsWith(`${year}-`),
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
      });
  }
  return { book, rows, year, today: clock.today };
}
