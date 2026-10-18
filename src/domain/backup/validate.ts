import {
  backupTables,
  BackupError,
  parseBackup,
  primaryColumns,
  type FullBackupV1,
} from "./format";
import { toView as expenseView } from "../expenses/engine";
import { toView as incomeView } from "../income/engine";
import { replay as savingsReplay } from "../savings/engine";
import { replay as investmentReplay } from "../investments/engine";
import type { ExpenseBook } from "../expenses/types";
import type { IncomeBook } from "../income/types";
import type { SavingsBook } from "../savings/types";
import type { InvestmentBook } from "../investments/types";

function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new BackupError(`Bản sao lưu không hợp lệ: ${message}`);
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function backupBooks(b: FullBackupV1) {
  const t = b.tables;
  const expenses: ExpenseBook | null = t.expense_books[0]
    ? {
        start: t.expense_books[0].start_month,
        version: t.expense_books[0].version,
        jars: t.expense_jars.map(({ start_month, ...r }) => ({
          ...r,
          start: start_month,
        })),
        inputs: t.expense_month_inputs.map(({ jar_id, ...r }) => ({
          ...r,
          jarId: jar_id,
        })),
        spends: t.expense_spends.map(({ jar_id, ...r }) => ({
          ...r,
          jarId: jar_id,
        })),
        labels: t.expense_labels,
        years: t.expense_years.map(({ closed_at, ...r }) => ({
          ...r,
          closedAt: closed_at,
        })),
        audit: t.expense_audit,
      }
    : null;
  const income: IncomeBook | null = t.income_books[0]
    ? {
        version: t.income_books[0].version,
        categories: t.income_categories.map(({ start_month, ...r }) => ({
          ...r,
          start: start_month,
        })),
        monthly: t.income_monthly.map(({ category_id, ...r }) => ({
          ...r,
          categoryId: category_id,
        })),
        oneOffs: t.income_oneoffs,
        audit: t.income_audit,
      }
    : null;
  const savings: SavingsBook | null = t.savings_books[0]
    ? {
        version: t.savings_books[0].version,
        categories: t.savings_categories.map((r) => r.data),
        revisions: t.savings_transactions
          .map((r) => r.data)
          .sort((a, b) => a.sequence - b.sequence),
        prices: t.savings_prices
          .map((r) => r.data)
          .sort((a, b) => a.sequence - b.sequence),
        closes: t.savings_closes
          .map((r) => r.data)
          .sort((a, b) => a.sequence - b.sequence),
        audit: t.savings_audit,
      }
    : null;
  const investments: InvestmentBook | null = t.investments_books[0]
    ? {
        version: t.investments_books[0].version,
        categories: t.investments_categories.map((r) => r.data),
        revisions: [...t.investments_transactions, ...t.investments_valuations]
          .map((r) => r.data)
          .sort((a, b) => a.sequence - b.sequence),
        audit: t.investments_audit,
      }
    : null;
  return { expenses, income, savings, investments };
}
export function validateBackup(input: unknown): FullBackupV1 {
  const b = parseBackup(input),
    t = b.tables;
  for (const table of backupTables) {
    const rows = t[table] as unknown as Record<string, unknown>[];
    const keys = primaryColumns(table),
      seen = new Set<string>();
    for (const row of rows) {
      const key = canonical(keys.map((k) => row[k]));
      requireValid(!seen.has(key), `trùng khóa tại ${table}.`);
      seen.add(key);
    }
    const head = `${table.split("_")[0]}_books` as keyof typeof t;
    requireValid(
      !rows.length || t[head].length === 1,
      `thiếu sổ gốc tại ${table}.`,
    );
  }
  const jars = new Map(t.expense_jars.map((r) => [r.id, r]));
  for (const r of [...t.expense_month_inputs, ...t.expense_spends])
    requireValid(jars.has(r.jar_id), "hũ tham chiếu không tồn tại.");
  const incomeCategories = new Set(t.income_categories.map((r) => r.id));
  for (const r of t.income_monthly)
    requireValid(
      incomeCategories.has(r.category_id),
      "danh mục thu nhập không tồn tại.",
    );
  const labels = new Set<string>();
  for (const r of t.expense_labels) {
    const key = `${r.kind}:${r.name.toLocaleLowerCase()}`;
    requireValid(!labels.has(key), "nhãn trùng tên.");
    labels.add(key);
  }
  for (const rows of [t.expense_jars, t.income_categories])
    for (const r of rows) {
      requireValid(
        r.rules[0].month === r.start_month,
        "quy tắc đầu tiên không khớp ngày bắt đầu.",
      );
      const months = r.rules.map((x) => x.month);
      requireValid(
        months.every((v, i) => i === 0 || v > months[i - 1]),
        "quy tắc tháng sai thứ tự.",
      );
    }
  const books = backupBooks(b);
  for (const [prefix, book] of [
    ["expense", books.expenses],
    ["income", books.income],
    ["savings", books.savings],
    ["investments", books.investments],
  ] as const) {
    if (!book) continue;
    const versions = new Set(book.audit.map((r) => r.version));
    requireValid(
      book.audit.length === versions.size &&
        book.audit.length === book.version &&
        book.audit.reduce((max, r) => Math.max(max, r.version), 0) ===
          book.version,
      `phiên bản lịch sử ${prefix} không khớp.`,
    );
    for (const c of t[`${prefix}_commands`])
      requireValid(
        c.result.version <= book.version,
        "kết quả lệnh vượt phiên bản sổ.",
      );
  }
  for (const prefix of ["savings", "investments"] as const) {
    const categories = t[`${prefix}_categories`],
      categoriesById = new Map(categories.map((r) => [r.id, r.data]));
    for (const c of categories) {
      requireValid(c.id === c.data.id, "mã danh mục không khớp dữ liệu.");
      const rules = c.data.rules;
      if (prefix === "savings") {
        const data = c.data as SavingsBook["categories"][number];
        requireValid(
          (data.kind === "gold") === (data.unit !== null),
          "đơn vị tài sản không hợp lệ.",
        );
      }
      requireValid(rules.length > 0, "thiếu quy tắc danh mục.");
      const creation = t[`${prefix}_audit`].find(
        (a) => a.action.type === "createCategory" && a.action.id === c.id,
      );
      requireValid(
        creation &&
          creation.action.type === "createCategory" &&
          creation.action.start === c.data.start,
        "danh mục không khớp lịch sử tạo.",
      );
      if (prefix === "savings") {
        const data = c.data as SavingsBook["categories"][number];
        requireValid(
          data.rules[0].month === data.start &&
            data.rules.every(
              (r, i) => i === 0 || r.month > data.rules[i - 1].month,
            ),
          "quy tắc tiết kiệm sai thứ tự.",
        );
      } else {
        const data = c.data as InvestmentBook["categories"][number];
        const sequences = new Set(data.rules.map((r) => r.sequence));
        requireValid(
          data.rules[0].date === data.start &&
            sequences.size === data.rules.length &&
            data.rules.every(
              (r) =>
                r.date >= data.start &&
                r.sequence <= (books.investments?.version ?? 0),
            ),
          "quy tắc đầu tư không hợp lệ.",
        );
      }
    }
    const rows =
      prefix === "savings"
        ? t.savings_transactions
        : [...t.investments_transactions, ...t.investments_valuations];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const seqs = new Set<number>();
    for (const r of rows) {
      requireValid(!seqs.has(r.sequence), "trùng số thứ tự giao dịch.");
      seqs.add(r.sequence);
      requireValid(
        r.id === r.data.id &&
          r.sequence === r.data.sequence &&
          r.root_id === r.data.rootId,
        "cột giao dịch không khớp nội dung.",
      );
      requireValid(
        r.id === r.root_id || r.id === `${r.root_id}:${r.sequence}`,
        "mã revision không hợp lệ.",
      );
      const root = byId.get(r.root_id);
      requireValid(
        root &&
          root.id === root.root_id &&
          root.data.transaction &&
          root.sequence <= r.sequence,
        "thiếu giao dịch gốc.",
      );
      const tx = r.data.transaction ?? root.data.transaction;
      requireValid(
        tx.id === r.root_id &&
          tx.categoryId === r.category_id &&
          categoriesById.has(tx.categoryId),
        "tham chiếu giao dịch không hợp lệ.",
      );
      requireValid(
        r.cash_category_id ===
          ("cashCategoryId" in tx ? tx.cashCategoryId : null) &&
          (!r.cash_category_id || categoriesById.has(r.cash_category_id)),
        "ví tiền chờ không hợp lệ.",
      );
      requireValid(
        !r.cash_category_id ||
          categoriesById.get(r.cash_category_id)?.kind === "cash",
        "danh mục đối ứng không phải tiền mặt.",
      );
      const entry = t[`${prefix}_audit`].find((a) => a.version === r.sequence);
      requireValid(entry, "giao dịch thiếu lịch sử tương ứng.");
      if (r.id === r.root_id)
        requireValid(
          entry.action.type === "postTransaction" &&
            canonical(entry.action.transaction) ===
              canonical(r.data.transaction),
          "giao dịch gốc không khớp audit.",
        );
      else
        requireValid(
          entry.action.type === "reviseTransaction" &&
            entry.action.transactionId === r.root_id &&
            entry.action.reason === r.data.reason &&
            canonical(entry.action.replacement) ===
              canonical(r.data.transaction),
          "revision không khớp audit.",
        );
      if (prefix === "investments")
        requireValid(
          (tx.kind === "valuation") ===
            t.investments_valuations.some((x) => x.id === r.id),
          "định giá nằm sai bảng.",
        );
      if ("contract_id" in r)
        requireValid(
          r.contract_id === ("contractId" in tx ? tx.contractId : null) &&
            (!r.contract_id || byId.has(r.contract_id)),
          "sổ tiết kiệm không tồn tại.",
        );
    }
    requireValid(
      rows.length === byId.size,
      "trùng mã giao dịch giữa các bảng.",
    );
  }
  const expectedAllocations: string[] = [];
  for (const r of t.savings_transactions)
    if (r.data.transaction?.kind === "sellGold")
      for (const a of r.data.transaction.allocations) {
        requireValid(
          t.savings_transactions.some(
            (x) =>
              x.id === a.lotId &&
              ["buyGold", "openingGold"].includes(
                x.data.transaction?.kind ?? "",
              ),
          ),
          "lô vàng không tồn tại.",
        );
        expectedAllocations.push(canonical([r.id, a.lotId]));
      }
  requireValid(
    canonical(expectedAllocations.sort()) ===
      canonical(
        t.savings_allocations
          .map((r) => canonical([r.revision_id, r.lot_id]))
          .sort(),
      ),
    "phân bổ lô vàng không khớp.",
  );
  for (const r of t.savings_prices)
    requireValid(
      r.id === r.data.id &&
        r.sequence === r.data.sequence &&
        r.category_id === r.data.categoryId &&
        t.savings_categories.some(
          (c) => c.id === r.category_id && c.data.kind === "gold",
        ),
      "giá vàng không khớp danh mục.",
    );
  for (const r of t.savings_closes)
    requireValid(
      r.id === r.data.id &&
        r.sequence === r.data.sequence &&
        (r.data.kind === "close") === (r.data.snapshot !== null),
      "kỳ chốt không hợp lệ.",
    );
  const savingsSequences = [
    ...t.savings_transactions,
    ...t.savings_prices,
    ...t.savings_closes,
  ].map((r) => r.sequence);
  requireValid(
    new Set(savingsSequences).size === savingsSequences.length &&
      savingsSequences.every((v) => v <= (books.savings?.version ?? 0)),
    "số thứ tự tiết kiệm không hợp lệ.",
  );
  for (const r of t.savings_prices) {
    const event = t.savings_audit.find((a) => a.version === r.sequence)?.action;
    requireValid(
      event?.type === "setPrice" &&
        event.id === r.id &&
        event.categoryId === r.category_id &&
        event.price === r.data.price &&
        event.date === r.data.date,
      "giá không khớp audit.",
    );
  }
  for (const r of t.savings_closes) {
    const event = t.savings_audit.find((a) => a.version === r.sequence)?.action;
    requireValid(
      event &&
        (r.data.kind === "close"
          ? event.type === "closeMonth"
          : event.type === "reopenMonth") &&
        "month" in event &&
        event.month === r.data.month,
      "kỳ chốt không khớp audit.",
    );
  }
  for (const y of t.expense_years)
    for (const row of y.snapshot ?? [])
      requireValid(
        jars.has(row.jarId) && row.month.startsWith(`${y.year}-`),
        "snapshot năm tham chiếu hũ hoặc tháng không hợp lệ.",
      );
  try {
    const today = b.exportedAt.slice(0, 10),
      clock = { today, now: b.exportedAt };
    expenseView(books.expenses, clock);
    incomeView(books.income, Number(today.slice(0, 4)), clock);
    if (books.savings) savingsReplay(books.savings, "2099-12-31");
    if (books.investments) investmentReplay(books.investments, "2099-12-31");
  } catch {
    throw new BackupError("Bản sao lưu có sổ dữ liệu hoặc số dư không hợp lệ.");
  }
  return b;
}
