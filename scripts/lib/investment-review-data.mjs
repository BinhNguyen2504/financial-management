import { randomUUID } from "node:crypto";
/** Synthetic local review ledger. No Notion amounts are imported and no cloud connection is used. */
export function buildInvestmentReviewData({
  ownerId,
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
} = {}) {
  const year = Number(today.slice(0, 4)),
    start = `${year - 1}-12-01`,
    day = (n) => [`${year}-01-${String(n).padStart(2, "0")}`, today].sort()[0];
  const book = { version: 0, categories: [], revisions: [], audit: [] },
    actions = [];
  function apply(action) {
    const seq = ++book.version,
      at = `${today}T00:00:00.000Z`;
    actions.push(action);
    book.audit.push({ version: seq, at, action });
    if (action.type === "createCategory")
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
    else if (action.type === "postTransaction") {
      const t = action.transaction;
      book.revisions.push({
        id: t.id,
        rootId: t.id,
        sequence: seq,
        at,
        transaction: t,
        reason: "",
      });
    } else if (action.type === "archiveCategory") {
      const c = book.categories.find((c) => c.id === action.categoryId);
      c.rules.push({
        ...c.rules.at(-1),
        date: action.date,
        sequence: seq,
        active: false,
      });
    }
  }
  function category(name, kind, emoji) {
    const id = randomUUID();
    apply({
      type: "createCategory",
      id,
      start,
      kind,
      name,
      emoji,
      description: "Dữ liệu minh họa local",
    });
    return id;
  }
  function tx(categoryId, kind, date, fields) {
    apply({
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        categoryId,
        kind,
        date,
        note: "Dữ liệu mẫu để review",
        counterparty: "",
        ...(["buy", "sell"].includes(kind)
          ? { fee: "0", tax: "0", cashCategoryId: null }
          : {}),
        ...fields,
      },
    });
  }
  const cash = category("Tiền chờ TCBS", "cash", "💼"),
    exchange = category("Tiền chờ sàn", "cash", "🌐"),
    stock = category("Cổ phiếu", "investment", "📈"),
    fund = category("Quỹ cổ phiếu", "investment", "🌿"),
    bond = category("Quỹ trái phiếu", "investment", "🏦"),
    crypto = category("Crypto", "investment", "🌐"),
    closed = category("Khoản đã kết thúc", "investment", "🍂");
  tx(cash, "openingCash", start, { amount: "20000000" });
  tx(exchange, "openingCash", start, { amount: "2000000" });
  for (const [id, cost, value] of [
    [stock, "100000000", "110000000"],
    [fund, "15000000", "16000000"],
    [bond, "5000000", "5050000"],
    [crypto, "7500000", "5700000"],
    [closed, "2000000", "2200000"],
  ])
    tx(id, "openingInvestment", start, { cost, value });
  tx(stock, "buy", day(1), {
    amount: "10000000",
    fee: "10000",
    cashCategoryId: cash,
    value: "122000000",
  });
  tx(stock, "sell", day(2), {
    amount: "30000000",
    cost: "25000000",
    fee: "100000",
    tax: "100000",
    cashCategoryId: cash,
    value: "95000000",
  });
  tx(cash, "deposit", day(3), {
    amount: "10000000",
    counterparty: "Ngân hàng bên ngoài",
  });
  tx(cash, "transfer", day(4), { amount: "1000000", cashCategoryId: exchange });
  tx(cash, "withdraw", day(5), {
    amount: "2000000",
    counterparty: "Ngân hàng bên ngoài",
  });
  tx(crypto, "buy", day(6), {
    amount: "1000000",
    value: "6500000",
    counterparty: "Mua trực tiếp từ bên ngoài",
  });
  tx(crypto, "sell", day(7), {
    amount: "200000",
    cost: "500000",
    fee: "10000",
    value: "6000000",
  });
  tx(closed, "sell", day(8), {
    amount: "2300000",
    cost: "2000000",
    cashCategoryId: cash,
    value: "0",
  });
  apply({ type: "archiveCategory", categoryId: closed, date: day(8) });
  tx(stock, "valuation", `${today.slice(0, 7)}-01`, { value: "97000000" });
  return {
    ownerId,
    today,
    book,
    actions,
    ids: { cash, exchange, stock, fund, bond, crypto, closed },
  };
}
const literal = (v) => `'${String(v).replaceAll("'", "''")}'`;
export function buildInvestmentReviewSQL(sample) {
  const { book, ownerId } = sample,
    o = literal(ownerId),
    commands = [
      `insert into public.investments_books(owner_id,version) values(${o},${book.version});`,
    ];
  for (const c of book.categories)
    commands.push(
      `insert into public.investments_categories(owner_id,id,data) values(${o},${literal(c.id)},${literal(JSON.stringify(c))}::jsonb);`,
    );
  for (const r of book.revisions) {
    const t = r.transaction,
      table =
        t.kind === "valuation"
          ? "investments_valuations"
          : "investments_transactions";
    commands.push(
      `insert into public.${table}(owner_id,id,root_id,sequence,category_id,cash_category_id,data) values(${o},${literal(r.id)},${literal(r.rootId)},${r.sequence},${literal(t.categoryId)},${t.cashCategoryId ? literal(t.cashCategoryId) : "null"},${literal(JSON.stringify(r))}::jsonb);`,
    );
  }
  for (const a of book.audit)
    commands.push(
      `insert into public.investments_audit(owner_id,version,at,action) values(${o},${a.version},${literal(a.at)},${literal(JSON.stringify(a.action))}::jsonb);`,
    );
  return { seed: `begin;\n${commands.join("\n")}\ncommit;` };
}
