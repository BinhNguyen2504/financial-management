import type {
  InvestmentBook,
  InvestmentState,
  TransactionEffect,
  Balance,
} from "./types";
import { fail, ruleAt, activeTransactions } from "./model";

/** Rebuild the financial state from ordered immutable history. */
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
