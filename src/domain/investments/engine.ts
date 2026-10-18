import { actionSchema, type InvestmentAction } from "./schema";
import type {
  Clock,
  InvestmentBook,
  InvestmentCategory,
  InvestmentState,
  InvestmentView,
  TransactionEffect,
  Balance,
} from "./types";
export {
  savingsClock as investmentClock,
  endOfMonth,
  previousDate,
  nextMonth,
} from "../savings/engine";
export class InvestmentError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_ACTION",
  ) {
    super(message);
  }
}
const fail = (message: string): never => {
  throw new InvestmentError(message);
};
export function emptyBook(): InvestmentBook {
  return { version: 0, categories: [], revisions: [], audit: [] };
}
export function ruleAt(
  c: InvestmentCategory,
  date: string,
  sequence = Infinity,
) {
  return c.rules
    .filter((r) => r.date < date || (r.date === date && r.sequence <= sequence))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence)
    .at(-1);
}
export function activeTransactions(book: InvestmentBook) {
  const latest = new Map<string, InvestmentBook["revisions"][number]>();
  const originals = new Map<string, number>();
  for (const r of book.revisions) {
    latest.set(r.rootId, r);
    if (r.id === r.rootId) originals.set(r.rootId, r.sequence);
  }
  return [...latest.values()]
    .filter((r) => r.transaction)
    .map((r) => ({
      transaction: r.transaction!,
      sequence: originals.get(r.rootId)!,
      revision: r,
    }))
    .sort(
      (a, b) =>
        a.transaction.date.localeCompare(b.transaction.date) ||
        a.sequence - b.sequence,
    );
}
export function replay(
  book: InvestmentBook,
  asOf: string,
  cutoff = Infinity,
): InvestmentState {
  const entries = new Map(
    book.categories.map((c) => [
      c.id,
      {
        c,
        cash: 0n,
        cost: 0n,
        value: null as bigint | null,
        valueDate: null as string | null,
        realized: 0n,
      },
    ]),
  );
  const effects: TransactionEffect[] = [];
  const balance = (v: ReturnType<typeof category>): Balance => ({
    cash: v.cash.toString(),
    cost: v.cost.toString(),
    value:
      v.c.kind === "cash" ? v.cash.toString() : (v.value?.toString() ?? null),
  });
  function category(id: string, date: string, seq: number, kind?: string) {
    const v = entries.get(id) ?? fail("Danh mục không tồn tại.");
    if (date < v.c.start || !ruleAt(v.c, date, seq)?.active)
      fail("Danh mục chưa bắt đầu hoặc đã lưu trữ tại ngày giao dịch.");
    if (kind && v.c.kind !== kind)
      fail("Loại danh mục không phù hợp với giao dịch.");
    return v;
  }
  for (const { transaction: t, sequence } of activeTransactions(book)) {
    if (t.date > asOf || (t.date === asOf && sequence > cutoff)) continue;
    const v = category(t.categoryId, t.date, sequence),
      cashId = "cashCategoryId" in t ? t.cashCategoryId : null;
    if (cashId === t.categoryId) fail("Hai phía giao dịch phải khác nhau.");
    const wallet = cashId ? category(cashId, t.date, sequence, "cash") : null;
    const e: TransactionEffect = {
      id: t.id,
      date: t.date,
      kind: t.kind,
      categoryId: t.categoryId,
      cashCategoryId: cashId,
      external: "0",
      internal: {},
      opening: {},
      net: "0",
      fees: "fee" in t ? t.fee : "0",
      tax: "tax" in t ? t.tax : "0",
      costSold: "0",
      realized: "0",
      note: t.note,
      counterparty: t.counterparty,
      before: { [t.categoryId]: balance(v) },
      after: {},
    };
    if (wallet) e.before[cashId!] = balance(wallet);
    function move(amount: bigint) {
      // Positive means capital enters the investment position; cash moves in the opposite direction.
      if (wallet) {
        wallet.cash -= amount;
        e.internal[t.categoryId] = amount.toString();
        e.internal[cashId!] = (-amount).toString();
      } else e.external = amount.toString();
    }
    const charges = BigInt(e.fees) + BigInt(e.tax);
    switch (t.kind) {
      case "openingCash":
        category(t.categoryId, t.date, sequence, "cash");
        v.cash = BigInt(t.amount);
        e.opening[t.categoryId] = t.amount;
        e.net = t.amount;
        break;
      case "openingInvestment":
        category(t.categoryId, t.date, sequence, "investment");
        v.cost = BigInt(t.cost);
        v.value = BigInt(t.value);
        v.valueDate = t.date;
        e.opening[t.categoryId] = t.value;
        e.net = t.value;
        break;
      case "deposit":
        category(t.categoryId, t.date, sequence, "cash");
        v.cash += BigInt(t.amount);
        e.external = t.amount;
        e.net = t.amount;
        break;
      case "withdraw":
        category(t.categoryId, t.date, sequence, "cash");
        v.cash -= BigInt(t.amount);
        e.external = (-BigInt(t.amount)).toString();
        e.net = t.amount;
        break;
      case "transfer":
        category(t.categoryId, t.date, sequence, "cash");
        if (!wallet) fail("Chọn ví nhận.");
        v.cash -= BigInt(t.amount);
        wallet!.cash += BigInt(t.amount);
        e.internal[t.categoryId] = (-BigInt(t.amount)).toString();
        e.internal[cashId!] = t.amount;
        e.net = t.amount;
        break;
      case "buy": {
        category(t.categoryId, t.date, sequence, "investment");
        const cost = BigInt(t.amount) + charges;
        v.cost += cost;
        move(cost);
        v.value = BigInt(t.value);
        v.valueDate = t.date;
        e.net = cost.toString();
        break;
      }
      case "sell": {
        category(t.categoryId, t.date, sequence, "investment");
        const net = BigInt(t.amount) - charges;
        if (net < 0n) fail("Phí/thuế vượt tiền bán.");
        if (BigInt(t.cost) === 0n && BigInt(t.amount) === 0n)
          fail("Cần tiền bán hoặc giá vốn bán lớn hơn 0.");
        v.cost -= BigInt(t.cost);
        move(-net);
        v.realized += net - BigInt(t.cost);
        v.value = BigInt(t.value);
        v.valueDate = t.date;
        e.net = net.toString();
        e.costSold = t.cost;
        e.realized = (net - BigInt(t.cost)).toString();
        break;
      }
      case "valuation":
        category(t.categoryId, t.date, sequence, "investment");
        v.value = BigInt(t.value);
        v.valueDate = t.date;
        e.net = t.value;
        break;
    }
    for (const x of entries.values()) {
      if (x.cash < 0n) fail(`Không đủ tiền tại ngày ${t.date}.`);
      if (x.cost < 0n) fail(`Giá vốn bán vượt vốn còn lại tại ngày ${t.date}.`);
    }
    e.after[t.categoryId] = balance(v);
    if (wallet) e.after[cashId!] = balance(wallet);
    effects.push(e);
  }
  const positions = [...entries.values()]
    .filter((v) => v.c.start <= asOf)
    .map((v) => {
      const r = ruleAt(v.c, asOf, cutoff)!;
      const value = v.c.kind === "cash" ? v.cash : v.value;
      const unrealized =
        v.c.kind === "cash" ? 0n : value === null ? null : value - v.cost;
      return {
        id: v.c.id,
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        kind: v.c.kind,
        active: r.active,
        cash: v.cash.toString(),
        cost: v.cost.toString(),
        value: value?.toString() ?? null,
        valueDate: v.valueDate,
        stale:
          v.c.kind === "investment" &&
          (v.cost !== 0n || value !== 0n) &&
          (!v.valueDate || v.valueDate.slice(0, 7) < asOf.slice(0, 7)),
        unrealized: unrealized?.toString() ?? null,
        realized: v.realized.toString(),
        roi:
          v.c.kind === "investment" && v.cost > 0n && unrealized !== null
            ? ((unrealized * 10000n) / v.cost).toString()
            : null,
      };
    });
  const missing = positions.filter((p) => p.value === null).map((p) => p.id),
    knownValue = positions
      .reduce((n, p) => n + BigInt(p.value ?? "0"), 0n)
      .toString();
  return {
    asOf,
    positions,
    effects,
    missing,
    knownValue,
    total: missing.length ? null : knownValue,
  };
}
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
