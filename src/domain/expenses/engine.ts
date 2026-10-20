import type {
  Clock,
  ExpenseBook,
  ExpenseRow,
  ExpenseView,
  JarRule,
  Month,
  RowChange,
} from "./types";
import { expenseActionSchema, type ExpenseAction } from "./schema";

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
export function vietnamClock(date = new Date()): Clock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    today: `${part("year")}-${part("month")}-${part("day")}`,
    now: date.toISOString(),
  };
}
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
export function materialize(book: ExpenseBook, clock: Clock): ExpenseRow[] {
  const current = clock.today.slice(0, 7);
  const year = Number(current.slice(0, 4));
  const rows: ExpenseRow[] = [];
  const inputs = new Map(book.inputs.map((i) => [`${i.jarId}/${i.month}`, i]));
  for (const jar of book.jars) {
    let balance = BigInt(jar.opening);
    for (const month of monthRange(jar.start, `${year}-12`)) {
      const sealed = book.years.find(
        (y) => y.year === Number(month.slice(0, 4)),
      )?.snapshot;
      if (sealed) {
        const row = sealed.find((r) => r.jarId === jar.id && r.month === month);
        if (row) {
          rows.push(row);
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
      const funding = BigInt(input?.funding ?? required.toString());
      const extra = BigInt(input?.extra ?? "0");
      const available = balance + funding + extra;
      let spent = 0n;
      let closing = available;
      const future = month > current;
      if (jar.kind === "monthly") {
        closing = BigInt(
          input?.closing ?? (rule.active ? "0" : available.toString()),
        );
        if (closing > available)
          throw new ExpenseError(
            `${rule.name}, ${month}: số dư lớn hơn tiền có trong hũ.`,
          );
        if (!future) spent = available - closing;
      } else {
        // Contributions occur at the start of each month. Same-day spends share that balance.
        const spends = book.spends
          .filter(
            (s) =>
              s.jarId === jar.id && !s.deleted && s.date.slice(0, 7) === month,
          )
          .sort(
            (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
          );
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
    const jar = book.jars.find((j) => j.id === id);
    if (!jar) throw new ExpenseError("Không tìm thấy hũ chi tiêu.", 404);
    return jar;
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
    case "configureJar":
    case "stopJar": {
      editable(book, action.month, clock);
      const jar = findJar(action.jarId);
      const rule = ruleAt(jar.rules, action.month);
      if (!rule) throw new ExpenseError("Hũ chưa bắt đầu trong tháng này.");
      const updated: JarRule =
        action.type === "stopJar"
          ? { ...rule, month: action.month, active: false }
          : {
              month: action.month,
              name: action.name,
              emoji: rule.emoji ?? null,
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
      const { type: _, ...input } = action;
      book.inputs = [
        ...book.inputs.filter(
          (i) => i.jarId !== action.jarId || i.month !== action.month,
        ),
        input,
      ];
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
  return materialize(after, clock).flatMap((row) => {
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
}
