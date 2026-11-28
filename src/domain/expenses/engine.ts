import type {
  Clock,
  ExpenseBook,
  ExpenseRow,
  ExpenseView,
  JarRule,
  Month,
  MonthInput,
  RowChange,
} from "./types";
import { expenseActionSchema, type ExpenseAction } from "./schema";
import { nameKey, nameTaken } from "../shared/names";

export class ExpenseError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_EXPENSE",
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export { vietnamClock } from "../shared/clock";

export function monthRange(start: Month, end: Month): Month[] {
  const result: Month[] = [];
  for (let m = start; m <= end;) {
    result.push(m);
    const [y, n] = m.split("-").map(Number);
    m = n === 12 ? `${y + 1}-01` : `${y}-${String(n + 1).padStart(2, "0")}`;
  }
  return result;
}
export function ruleAt(rules: JarRule[], month: Month): JarRule | undefined {
  return rules
    .filter((r) => r.month <= month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
}
const positive = (n: bigint) => (n > 0n ? n : 0n);
function bounded(n: bigint, label: string): string {
  if (n < 0n || n >= 10n ** 24n)
    throw new ExpenseError(`${label}: số tiền ngoài giới hạn.`);
  return n.toString();
}
/**
 * First month in which a jar starts as "not funded yet" until the user marks
 * it. Earlier months keep their historical figures (counted as funded).
 */
export const FUNDING_MARK_START: Month = "2026-11";
/**
 * Whether the month's contribution counts as already put in the jar. Planned
 * (future) months and stopped jars keep the plan, and an accumulation jar that
 * already has recorded usages that month must have received its money.
 */
function isFunded(
  input: MonthInput | undefined,
  active: boolean,
  month: Month,
  future: boolean,
  usages: number,
): boolean {
  if (future || !active) return true;
  return input?.funded ?? (month < FUNDING_MARK_START || usages > 0);
}
export function materialize(
  book: ExpenseBook,
  clock: Clock,
  onlyMonth?: Month,
): ExpenseRow[] {
  const current = clock.today.slice(0, 7);
  const year = Number(current.slice(0, 4));
  const rows: ExpenseRow[] = [];
  const inputs = new Map(book.inputs.map((i) => [`${i.jarId}/${i.month}`, i]));
  for (const jar of book.jars) {
    if (jar.deleted) continue;
    let balance = BigInt(jar.opening);
    for (const month of monthRange(jar.start, onlyMonth ?? `${year}-12`)) {
      const sealed = book.years.find(
        (y) => y.year === Number(month.slice(0, 4)),
      )?.snapshot;
      if (sealed) {
        const row = sealed.find((r) => r.jarId === jar.id && r.month === month);
        if (row) {
          if (!onlyMonth || month === onlyMonth) rows.push(row);
          balance = BigInt(row.closing);
        }
        continue;
      }
      const rule = ruleAt(jar.rules, month);
      if (!rule) continue;
      const input = inputs.get(`${jar.id}/${month}`);
      const target = BigInt(input?.target ?? (rule.active ? rule.amount : "0"));
      const required = rule.active
        ? jar.kind === "monthly"
          ? positive(target - balance)
          : target
        : 0n;
      const future = month > current;
      // Contributions occur at the start of each month. Same-day spends share that balance.
      const spends =
        jar.kind === "accumulation"
          ? book.spends
              .filter(
                (s) =>
                  s.jarId === jar.id &&
                  !s.deleted &&
                  s.date.slice(0, 7) === month,
              )
              .sort(
                (a, b) =>
                  a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
              )
          : [];
      const funded = isFunded(input, rule.active, month, future, spends.length);
      // Until the user marks the jar as funded, nothing has entered it yet.
      const funding = funded
        ? BigInt(input?.funding ?? required.toString())
        : 0n;
      const extra = BigInt(input?.extra ?? "0");
      const available = balance + funding + extra;
      let spent = 0n;
      let closing = available;
      if (jar.kind === "monthly") {
        closing = BigInt(
          input?.closing ??
            (rule.active && funded ? "0" : available.toString()),
        );
        if (closing > available) {
          // A closing typed while the jar was funded must not break an unfunded month.
          if (funded)
            throw new ExpenseError(
              `${rule.name}, ${month}: số dư lớn hơn tiền có trong hũ.`,
            );
          closing = available;
        }
        if (!future) spent = available - closing;
      } else {
        for (const spend of spends) {
          const value = BigInt(spend.amount);
          if (closing < value)
            throw new ExpenseError(
              `${rule.name}, ${spend.date}: không đủ tiền để sử dụng. Kiểm tra cả các tháng bị ảnh hưởng.`,
            );
          closing -= value;
          spent += value;
        }
      }
      if (!onlyMonth || month === onlyMonth)
        rows.push({
          jarId: jar.id,
          month,
          kind: jar.kind,
          name: rule.name,
          emoji: rule.emoji ?? null,
          description: rule.description,
          method: rule.method,
          group: rule.group,
          active: rule.active,
          target: bounded(target, rule.name),
          opening: bounded(balance, rule.name),
          required: bounded(required, rule.name),
          funding: bounded(funding, rule.name),
          extra: bounded(extra, rule.name),
          available: bounded(available, rule.name),
          spent: bounded(spent, rule.name),
          closing: bounded(closing, rule.name),
          over: bounded(
            jar.kind === "monthly" ? positive(spent - target) : 0n,
            rule.name,
          ),
          status: future
            ? "planned"
            : month === current
              ? "provisional"
              : "actual",
          funded,
        });
      balance = closing;
    }
  }
  return rows.sort(
    (a, b) =>
      a.month.localeCompare(b.month) || a.name.localeCompare(b.name, "vi"),
  );
}
export function ensureYears(book: ExpenseBook, clock: Clock): void {
  for (
    let y = Number(book.start.slice(0, 4));
    y <= Number(clock.today.slice(0, 4));
    y++
  ) {
    if (!book.years.some((v) => v.year === y))
      book.years.push({ year: y, closedAt: null, snapshot: null });
  }
}
export function toView(book: ExpenseBook | null, clock: Clock): ExpenseView {
  if (book) {
    book = structuredClone(book);
    ensureYears(book, clock);
  }
  return {
    book,
    rows: book ? materialize(book, clock) : [],
    today: clock.today,
    currentYear: Number(clock.today.slice(0, 4)),
  };
}
function editable(book: ExpenseBook, month: Month, clock: Clock) {
  if (month < book.start || month > `${clock.today.slice(0, 4)}-12`)
    throw new ExpenseError("Tháng nằm ngoài thời gian quản lý.");
  if (
    book.years.some((y) => y.year === Number(month.slice(0, 4)) && y.closedAt)
  )
    throw new ExpenseError(
      "Năm đã chốt, chỉ có thể xem và xuất backup.",
      409,
      "YEAR_CLOSED",
    );
}
export function applyAction(
  previous: ExpenseBook | null,
  rawAction: ExpenseAction,
  clock: Clock,
): ExpenseBook {
  const action = expenseActionSchema.parse(rawAction);
  if (action.type === "initialize") {
    if (previous)
      throw new ExpenseError("Bạn đã thiết lập thời gian quản lý.", 409);
    if (action.start > clock.today.slice(0, 7))
      throw new ExpenseError("Tháng bắt đầu không được ở tương lai.");
    const book: ExpenseBook = {
      start: action.start,
      version: 1,
      jars: [],
      inputs: [],
      spends: [],
      labels: [],
      years: [],
      audit: [],
    };
    ensureYears(book, clock);
    book.audit.push({
      version: 1,
      at: clock.now,
      action: action.type,
      detail: action,
    });
    return book;
  }
  if (!previous) throw new ExpenseError("Hãy chọn tháng bắt đầu trước.");
  const book = structuredClone(previous);
  ensureYears(book, clock);
  const findJar = (id: string) => {
    const jar = book.jars.find((j) => j.id === id && !j.deleted);
    if (!jar) throw new ExpenseError("Không tìm thấy hũ chi tiêu.", 404);
    return jar;
  };
  /**
   * A new or renamed jar may not reuse another jar's name (stopped jars still
   * count while they appear in history). Only the actions that set a name call
   * this, so older duplicates stay readable and editable.
   */
  const ensureUniqueJarName = (
    name: string,
    months: string[],
    exceptId?: string,
  ) => {
    const taken = book.jars
      .filter((j) => !j.deleted && j.id !== exceptId)
      .flatMap((j) => [
        ...months.map((m) => ruleAt(j.rules, m)?.name),
        // Later starts and renames count too, even future ones.
        ...j.rules.filter((r) => r.month > months[0]).map((r) => r.name),
      ]);
    if (nameTaken(name, taken)) {
      const message = "Tên hũ đã tồn tại.";
      throw new ExpenseError(message, 422, "DUPLICATE_NAME", { name: message });
    }
  };
  if (action.type === "createJar" || action.type === "configureJar") {
    const original =
      action.type === "configureJar"
        ? ruleAt(findJar(action.jarId).rules, action.month)
        : undefined;
    for (const field of ["method", "group"] as const) {
      const options = book.labels.filter((label) => label.kind === field);
      // Older integrations may predate catalogs. Once a catalog exists, new
      // selections must be in it; unchanged historical labels remain valid.
      if (
        options.length &&
        action[field] &&
        action[field] !== original?.[field] &&
        !options.some((label) => label.name === action[field])
      ) {
        const message =
          field === "method"
            ? "Chọn một phương thức có sẵn trong Phân loại."
            : "Chọn một nhóm mục đích có sẵn hoặc để trống.";
        throw new ExpenseError(message, 422, "INVALID_CLASSIFICATION", {
          [field]: message,
        });
      }
    }
  }
  switch (action.type) {
    case "createJar": {
      editable(book, action.start, clock);
      if (book.jars.some((j) => j.id === action.id))
        throw new ExpenseError("Hũ đã tồn tại.", 409);
      ensureUniqueJarName(action.name, [action.start, clock.today.slice(0, 7)]);
      book.jars.push({
        id: action.id,
        kind: action.kind,
        start: action.start,
        opening: action.opening,
        rules: [
          {
            month: action.start,
            name: action.name,
            emoji: action.emoji ?? null,
            description: action.description,
            method: action.method,
            group: action.group,
            amount: action.amount,
            active: true,
          },
        ],
      });
      break;
    }
    case "setJarEmoji": {
      editable(book, action.month, clock);
      const jar = findJar(action.jarId);
      const rule = ruleAt(jar.rules, action.month);
      if (!rule) throw new ExpenseError("Hũ chưa bắt đầu trong tháng này.");
      jar.rules = [
        ...jar.rules.filter((r) => r.month !== action.month),
        { ...rule, month: action.month, emoji: action.emoji },
      ].sort((a, b) => a.month.localeCompare(b.month));
      break;
    }
    case "deleteJar": {
      const jar = findJar(action.jarId);
      editable(book, clock.today.slice(0, 7), clock);
      const sealed = book.years.find((y) =>
        y.snapshot?.some((r) => r.jarId === jar.id),
      );
      if (sealed)
        throw new ExpenseError(
          "Hũ có dữ liệu trong năm đã chốt nên không thể xóa. Hãy dùng “Ngừng cấp tiền” để giữ lịch sử.",
          409,
          "JAR_IN_CLOSED_YEAR",
        );
      jar.deleted = true;
      break;
    }
    case "configureJar":
    case "stopJar": {
      editable(book, action.month, clock);
      const jar = findJar(action.jarId);
      const rule = ruleAt(jar.rules, action.month);
      if (!rule) throw new ExpenseError("Hũ chưa bắt đầu trong tháng này.");
      if (
        action.type === "configureJar" &&
        nameKey(action.name) !== nameKey(rule.name)
      )
        ensureUniqueJarName(
          action.name,
          [action.month, clock.today.slice(0, 7)],
          jar.id,
        );
      const updated: JarRule =
        action.type === "stopJar"
          ? { ...rule, month: action.month, active: false }
          : {
              month: action.month,
              name: action.name,
              emoji:
                action.emoji === undefined
                  ? (rule.emoji ?? null)
                  : action.emoji,
              description: action.description,
              method: action.method,
              group: action.group,
              amount: action.amount,
              active: true,
            };
      jar.rules = [
        ...jar.rules.filter((r) => r.month !== action.month),
        updated,
      ].sort((a, b) => a.month.localeCompare(b.month));
      if (action.type === "configureJar") {
        const input = book.inputs.find(
          (i) => i.jarId === jar.id && i.month === action.month,
        );
        if (input) input.target = null;
      }
      break;
    }
    case "editMonth": {
      editable(book, action.month, clock);
      const jar = findJar(action.jarId);
      if (action.month < jar.start)
        throw new ExpenseError("Hũ chưa bắt đầu trong tháng này.");
      if (jar.kind === "accumulation" && action.closing !== null)
        throw new ExpenseError("Số dư tích lũy được tính từ các lần sử dụng.");
      if (
        action.month > clock.today.slice(0, 7) &&
        (action.funding !== null ||
          action.extra !== "0" ||
          action.closing !== null)
      )
        throw new ExpenseError("Tháng tương lai chỉ điều chỉnh mức kế hoạch.");
      const { type: _, ...fields } = action;
      const previous = book.inputs.find(
        (i) => i.jarId === action.jarId && i.month === action.month,
      );
      // Editing amounts must not erase the user's funded mark.
      const input: MonthInput =
        previous?.funded == null
          ? fields
          : { ...fields, funded: previous.funded };
      book.inputs = [
        ...book.inputs.filter(
          (i) => i.jarId !== action.jarId || i.month !== action.month,
        ),
        input,
      ];
      break;
    }
    case "setJarFunded": {
      editable(book, action.month, clock);
      const jar = findJar(action.jarId);
      if (action.month < jar.start)
        throw new ExpenseError("Hũ chưa bắt đầu trong tháng này.");
      if (action.month > clock.today.slice(0, 7))
        throw new ExpenseError(
          "Chỉ đánh dấu bỏ hũ cho tháng hiện tại hoặc đã qua.",
        );
      if (!ruleAt(jar.rules, action.month)?.active)
        throw new ExpenseError("Hũ đã ngừng không cần đánh dấu bỏ hũ.");
      const existing = book.inputs.find(
        (i) => i.jarId === action.jarId && i.month === action.month,
      );
      if (existing) existing.funded = action.funded;
      else
        book.inputs.push({
          jarId: action.jarId,
          month: action.month,
          target: null,
          funding: null,
          extra: "0",
          closing: null,
          funded: action.funded,
        });
      break;
    }
    case "upsertSpend": {
      editable(book, action.date.slice(0, 7), clock);
      const jar = findJar(action.jarId);
      if (jar.kind !== "accumulation")
        throw new ExpenseError("Chỉ hũ tích lũy ghi từng lần sử dụng.");
      if (action.date < `${jar.start}-01` || action.date > clock.today)
        throw new ExpenseError(
          "Ngày sử dụng phải từ lúc bắt đầu hũ đến hôm nay.",
        );
      const old = book.spends.find((s) => s.id === action.id);
      if (old) {
        editable(book, old.date.slice(0, 7), clock);
        if (old.jarId !== action.jarId)
          throw new ExpenseError("Không thể chuyển lần sử dụng sang hũ khác.");
      }
      const { type: _, ...spend } = action;
      book.spends = [
        ...book.spends.filter((s) => s.id !== action.id),
        { ...spend, deleted: false },
      ];
      break;
    }
    case "deleteSpend": {
      const spend = book.spends.find((s) => s.id === action.id && !s.deleted);
      if (!spend) throw new ExpenseError("Không tìm thấy lần sử dụng.", 404);
      // A deleted jar's usages are hidden with it, so they cannot be changed separately.
      findJar(spend.jarId);
      editable(book, spend.date.slice(0, 7), clock);
      spend.deleted = true;
      break;
    }
    case "upsertLabel": {
      if (
        book.labels.some(
          (l) =>
            l.id !== action.id &&
            l.kind === action.kind &&
            l.name.toLocaleLowerCase("vi") ===
              action.name.toLocaleLowerCase("vi"),
        )
      )
        throw new ExpenseError("Tên đã tồn tại.");
      const old = book.labels.find((l) => l.id === action.id);
      if (old && old.kind !== action.kind)
        throw new ExpenseError("Không thể đổi loại phân loại.");
      book.labels = [
        ...book.labels.filter((l) => l.id !== action.id),
        {
          id: action.id,
          kind: action.kind,
          name: action.name,
          brandKey:
            action.brandKey === undefined
              ? (old?.brandKey ?? null)
              : action.brandKey,
          iconKey:
            action.iconKey === undefined
              ? (old?.iconKey ?? null)
              : action.iconKey,
        },
      ];
      break;
    }
    case "deleteLabel":
      book.labels = book.labels.filter((l) => l.id !== action.id);
      break;
    case "closeYear": {
      if (action.year >= Number(clock.today.slice(0, 4)))
        throw new ExpenseError("Chỉ chốt năm đã kết thúc.");
      const year = book.years.find((y) => y.year === action.year);
      if (!year) throw new ExpenseError("Năm không tồn tại.", 404);
      if (year.closedAt) throw new ExpenseError("Năm đã được chốt.", 409);
      if (book.years.some((y) => y.year < action.year && !y.closedAt))
        throw new ExpenseError("Hãy chốt các năm trước theo thứ tự.");
      year.snapshot = materialize(book, clock).filter(
        (r) => Number(r.month.slice(0, 4)) === action.year,
      );
      year.closedAt = clock.now;
      break;
    }
  }
  // Validate every downstream month, including the next year's opening balances.
  materialize(book, clock);
  book.version++;
  book.audit.push({
    version: book.version,
    at: clock.now,
    action: action.type,
    detail: action,
  });
  return book;
}
export function changes(
  before: ExpenseBook | null,
  after: ExpenseBook,
  clock: Clock,
): RowChange[] {
  const original = new Map(
    (before ? materialize(before, clock) : []).map((r) => [
      `${r.jarId}/${r.month}`,
      r,
    ]),
  );
  const rows = materialize(after, clock);
  const kept = new Set(rows.map((r) => `${r.jarId}/${r.month}`));
  const removed = [...original]
    .filter(([key]) => !kept.has(key))
    .map(([, prev]) => ({
      jarId: prev.jarId,
      name: prev.name,
      month: prev.month,
      before: {
        funding: (BigInt(prev.funding) + BigInt(prev.extra)).toString(),
        closing: prev.closing,
        spent: prev.spent,
      },
      after: null,
    }));
  const updated = rows.flatMap((row) => {
    const prev = original.get(`${row.jarId}/${row.month}`);
    const pick = (r: ExpenseRow) => ({
      funding: (BigInt(r.funding) + BigInt(r.extra)).toString(),
      closing: r.closing,
      spent: r.spent,
    });
    return !prev || JSON.stringify(prev) !== JSON.stringify(row)
      ? [
          {
            jarId: row.jarId,
            name: row.name,
            month: row.month,
            before: prev ? pick(prev) : null,
            after: pick(row),
          },
        ]
      : [];
  });
  return [...updated, ...removed];
}
