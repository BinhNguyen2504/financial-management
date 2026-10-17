import {
  actionSchema,
  type SavingsAction,
  type SavingsTransaction,
} from "./schema";
import type {
  Clock,
  SavingsBook,
  SavingsCategory,
  SavingsState,
  SavingsView,
  TransactionEffect,
} from "./types";
export class SavingsError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_ACTION",
  ) {
    super(message);
  }
}
export function savingsClock(): Clock {
  const now = new Date();
  return {
    now: now.toISOString(),
    today: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
  };
}
const fail = (message: string): never => {
  throw new SavingsError(message);
};
export const scale = 1_000_000n;
export function quantity(v: string): bigint {
  const [a, b = ""] = v.split(".");
  return BigInt(a) * scale + BigInt(b.padEnd(6, "0"));
}
export function quantityText(v: bigint) {
  return `${v / scale}${v % scale ? `.${(v % scale).toString().padStart(6, "0").replace(/0+$/, "")}` : ""}`;
}
export const roundedValue = (q: bigint, price: bigint) =>
  (q * price + scale / 2n) / scale;
export const endOfMonth = (m: string) =>
  new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 0))
    .toISOString()
    .slice(0, 10);
export const previousDate = (d: string) =>
  new Date(new Date(`${d}T00:00:00Z`).valueOf() - 86400000)
    .toISOString()
    .slice(0, 10);
export const nextMonth = (m: string) =>
  new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 1))
    .toISOString()
    .slice(0, 7);
export function ruleAt(c: SavingsCategory, month: string) {
  return c.rules
    .filter((r) => r.month <= month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
}
export function activeTransactions(book: SavingsBook) {
  const latest = new Map<string, (typeof book.revisions)[number]>();
  for (const r of book.revisions) latest.set(r.rootId, r);
  const original = new Map(
    book.revisions
      .filter((r) => r.id === r.rootId)
      .map((r) => [r.rootId, r.sequence]),
  );
  return [...latest.values()]
    .filter((r) => r.transaction)
    .map((r) => ({
      transaction: r.transaction!,
      sequence: original.get(r.rootId) ?? r.sequence,
    }))
    .sort(
      (a, b) =>
        a.transaction.date.localeCompare(b.transaction.date) ||
        a.sequence - b.sequence,
    );
}
export function closedMonths(book: SavingsBook) {
  const closed = new Set<string>();
  for (const c of book.closes) {
    if (c.kind === "close") closed.add(c.month);
    else for (const m of closed) if (m >= c.month) closed.delete(m);
  }
  return [...closed].sort();
}
function ensureOpen(book: SavingsBook, month: string) {
  if (closedMonths(book).some((m) => m >= month))
    throw new SavingsError(
      "Tháng này hoặc tháng sau đã chốt. Mở lại tháng bị ảnh hưởng trước khi sửa.",
      409,
      "MONTH_CLOSED",
    );
}
export function emptyBook(): SavingsBook {
  return {
    version: 0,
    categories: [],
    revisions: [],
    prices: [],
    closes: [],
    audit: [],
  };
}

/** Replay every transaction in business order; all money and quantities stay integer. */
export function replay(book: SavingsBook, asOf: string): SavingsState {
  const values = new Map(book.categories.map((c) => [c.id, { c, cash: 0n }]));
  const lots = new Map<
    string,
    {
      id: string;
      categoryId: string;
      date: string;
      quantity: bigint;
      cost: bigint;
    }
  >();
  const contracts = new Map<
    string,
    {
      id: string;
      categoryId: string;
      name: string;
      opened: string;
      maturity: string;
      term: string;
      principal: bigint;
      previousId: string | null;
    }
  >();
  const effects: TransactionEffect[] = [];
  const openingPrices: {
    categoryId: string;
    date: string;
    price: string;
    sequence: number;
  }[] = [];
  function category(id: string, date: string, kind?: string) {
    const v = values.get(id) ?? fail("Danh mục không tồn tại.");
    const r = ruleAt(v.c, date.slice(0, 7));
    if (!r?.active || v.c.start > date.slice(0, 7))
      fail("Danh mục chưa bắt đầu hoặc đã lưu trữ tại ngày giao dịch.");
    if (kind && v.c.kind !== kind)
      fail("Loại danh mục không phù hợp với giao dịch.");
    return v;
  }
  for (const { transaction: t, sequence } of activeTransactions(book)) {
    if (t.date > asOf) continue;
    const v = category(t.categoryId, t.date);
    const cashId = "cashCategoryId" in t ? t.cashCategoryId : null;
    if (cashId === t.categoryId)
      fail("Hai phía giao dịch phải là hai danh mục khác nhau.");
    const wallet = cashId ? category(cashId, t.date, "cash") : null;
    const e: TransactionEffect = {
      id: t.id,
      date: t.date,
      kind: t.kind,
      categoryId: t.categoryId,
      cashCategoryId: cashId,
      external: "0",
      internal: {},
      opening: {},
      interest: "0",
      realized: "0",
      fees: "0",
      net: "0",
      costSold: "0",
      quantity: "0",
      note: t.note,
    };
    const charges =
      ("fee" in t ? BigInt(t.fee) : 0n) + ("tax" in t ? BigInt(t.tax) : 0n);
    e.fees = charges.toString();
    function move(amount: bigint, incoming: boolean) {
      const signed = incoming ? amount : -amount;
      if (wallet) {
        wallet.cash -= signed;
        e.internal[t.categoryId] = signed.toString();
        e.internal[cashId!] = (-signed).toString();
      } else e.external = signed.toString();
    }
    function getContract(id: string) {
      const c =
        contracts.get(id) ?? fail("Sổ tiền gửi không tồn tại hoặc chưa mở.");
      if (c.categoryId !== t.categoryId || c.principal <= 0n)
        fail("Sổ không thuộc danh mục hoặc đã tất toán.");
      return c;
    }
    function open(principal: bigint, previousId: string | null = null) {
      if (!("maturity" in t)) return fail("Thiếu ngày đáo hạn.");
      if (t.maturity < t.date) fail("Ngày đáo hạn phải từ ngày gửi trở đi.");
      if (contracts.has(t.id)) fail("Mã sổ đã tồn tại.");
      contracts.set(t.id, {
        id: t.id,
        categoryId: t.categoryId,
        name: t.name,
        opened: t.date,
        maturity: t.maturity,
        term: t.term,
        principal,
        previousId,
      });
    }
    switch (t.kind) {
      case "openingCash":
        category(t.categoryId, t.date, "cash");
        v.cash += BigInt(t.amount);
        e.opening[t.categoryId] = t.amount;
        e.net = t.amount;
        break;
      case "openingDeposit":
        category(t.categoryId, t.date, "deposit");
        open(BigInt(t.amount));
        e.opening[t.categoryId] = t.amount;
        e.net = t.amount;
        break;
      case "openingGold": {
        category(t.categoryId, t.date, "gold");
        lots.set(t.id, {
          id: t.id,
          categoryId: t.categoryId,
          date: t.date,
          quantity: quantity(t.quantity),
          cost: BigInt(t.amount),
        });
        openingPrices.push({
          categoryId: t.categoryId,
          date: t.date,
          price: t.unitPrice,
          sequence,
        });
        e.opening[t.categoryId] = roundedValue(
          quantity(t.quantity),
          BigInt(t.unitPrice),
        ).toString();
        e.net = e.opening[t.categoryId];
        e.quantity = t.quantity;
        break;
      }
      case "deposit":
        category(t.categoryId, t.date, "cash");
        v.cash += BigInt(t.amount);
        e.external = t.amount;
        e.net = t.amount;
        break;
      case "withdraw":
        category(t.categoryId, t.date, "cash");
        v.cash -= BigInt(t.amount) + charges;
        e.external = (-BigInt(t.amount)).toString();
        e.net = t.amount;
        break;
      case "transfer":
        category(t.categoryId, t.date, "cash");
        wallet!.cash += BigInt(t.amount);
        v.cash -= BigInt(t.amount) + charges;
        e.internal[t.categoryId] = (-BigInt(t.amount)).toString();
        e.internal[cashId!] = t.amount;
        e.net = t.amount;
        break;
      case "openDeposit":
        category(t.categoryId, t.date, "deposit");
        open(BigInt(t.amount));
        move(BigInt(t.amount), true);
        e.net = t.amount;
        break;
      case "withdrawDeposit": {
        category(t.categoryId, t.date, "deposit");
        const c = getContract(t.contractId);
        c.principal -= BigInt(t.amount);
        if (c.principal < 0n) fail("Số gốc rút vượt gốc còn lại.");
        const net = BigInt(t.amount) + BigInt(t.interest) - charges;
        if (net < 0n) fail("Tiền nhận ròng không thể âm.");
        move(net, false);
        e.net = net.toString();
        e.interest = t.interest;
        break;
      }
      case "interest": {
        category(t.categoryId, t.date, "deposit");
        const c = getContract(t.contractId);
        e.interest = t.amount;
        e.net = t.amount;
        if (t.capitalize) {
          if (wallet) fail("Lãi nhập gốc không chọn ví nhận.");
          c.principal += BigInt(t.amount);
        } else move(BigInt(t.amount), false);
        break;
      }
      case "rollover": {
        category(t.categoryId, t.date, "deposit");
        const c = getContract(t.contractId);
        const remaining =
          BigInt(t.interest) - charges - BigInt(t.reinvestInterest);
        if (remaining < 0n) fail("Lãi tái tục và phí vượt lãi thực nhận.");
        open(c.principal + BigInt(t.reinvestInterest), c.id);
        c.principal = 0n;
        if (remaining) move(remaining, false);
        e.interest = t.interest;
        e.net = remaining.toString();
        break;
      }
      case "buyGold": {
        category(t.categoryId, t.date, "gold");
        const q = quantity(t.quantity),
          cost = roundedValue(q, BigInt(t.unitPrice)) + charges;
        lots.set(t.id, {
          id: t.id,
          categoryId: t.categoryId,
          date: t.date,
          quantity: q,
          cost,
        });
        move(cost, true);
        e.net = cost.toString();
        e.quantity = t.quantity;
        break;
      }
      case "sellGold": {
        category(t.categoryId, t.date, "gold");
        let q = 0n,
          cost = 0n;
        const used = new Set<string>();
        for (const a of t.allocations) {
          if (used.has(a.lotId)) fail("Mỗi đợt mua chỉ chọn một lần.");
          used.add(a.lotId);
          const l = lots.get(a.lotId) ?? fail("Đợt mua chưa tồn tại.");
          const part = quantity(a.quantity);
          if (l.categoryId !== t.categoryId || part > l.quantity)
            fail("Lượng bán vượt lượng còn lại hoặc sai danh mục.");
          const allocated =
            part === l.quantity ? l.cost : (l.cost * part) / l.quantity;
          l.quantity -= part;
          l.cost -= allocated;
          q += part;
          cost += allocated;
        }
        const net = roundedValue(q, BigInt(t.unitPrice)) - charges;
        if (net < 0n) fail("Phí vượt tiền bán.");
        move(net, false);
        e.net = net.toString();
        e.costSold = cost.toString();
        e.realized = (net - cost).toString();
        e.quantity = quantityText(q);
        break;
      }
      case "fee":
        category(t.categoryId, t.date, "cash");
        v.cash -= BigInt(t.amount);
        e.fees = t.amount;
        e.net = t.amount;
        break;
    }
    if ([...values.values()].some((x) => x.cash < 0n))
      fail(`Không đủ tiền tại ngày ${t.date}.`);
    effects.push(e);
  }
  const positions = book.categories
    .filter((c) => c.start <= asOf.slice(0, 7))
    .map((c) => {
      const r = ruleAt(c, asOf.slice(0, 7))!;
      const held = [...lots.values()].filter((l) => l.categoryId === c.id);
      const q = held.reduce((n, l) => n + l.quantity, 0n);
      const principal = [...contracts.values()]
        .filter((x) => x.categoryId === c.id)
        .reduce((n, x) => n + x.principal, 0n);
      const cash = values.get(c.id)!.cash;
      const cost =
        c.kind === "gold"
          ? held.reduce((n, l) => n + l.cost, 0n)
          : c.kind === "deposit"
            ? principal
            : cash;
      const p = [...openingPrices, ...book.prices]
        .filter((p) => p.categoryId === c.id && p.date <= asOf)
        .sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence)
        .at(-1);
      const value =
        c.kind !== "gold"
          ? cost.toString()
          : q === 0n
            ? "0"
            : p
              ? roundedValue(q, BigInt(p.price)).toString()
              : null;
      return {
        id: c.id,
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        kind: c.kind,
        unit: c.unit,
        active: r.active,
        cash: (c.kind === "deposit" ? principal : cash).toString(),
        quantity: quantityText(q),
        cost: cost.toString(),
        value,
        price: p?.price ?? null,
        priceDate: p?.date ?? null,
        stale:
          c.kind === "gold" &&
          q > 0n &&
          (!p || p.date.slice(0, 7) < asOf.slice(0, 7)),
        unrealized: value === null ? null : (BigInt(value) - cost).toString(),
      };
    });
  const missing = positions.filter((p) => p.value === null).map((p) => p.id);
  const knownValue = positions
    .reduce((n, p) => n + BigInt(p.value ?? 0), 0n)
    .toString();
  return {
    asOf,
    positions,
    contracts: [...contracts.values()].map((c) => ({
      ...c,
      principal: c.principal.toString(),
    })),
    lots: [...lots.values()].map((l) => ({
      ...l,
      quantity: quantityText(l.quantity),
      cost: l.cost.toString(),
    })),
    effects,
    knownValue,
    total: missing.length ? null : knownValue,
    missing,
  };
}

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
