import type { SavingsBook, SavingsState, TransactionEffect } from "./types";

import {
  fail,
  quantity,
  quantityText,
  roundedValue,
  ruleAt,
  activeTransactions,
} from "./model";

/** Rebuild the financial state from ordered immutable history. */
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
