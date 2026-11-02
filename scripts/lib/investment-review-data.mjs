import { randomUUID } from "node:crypto";
/** Fixed illustrative workflows, isolated from account financial data. */
export function buildInvestmentReviewData({
  ownerId,
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  description = "Dữ liệu minh họa local",
} = {}) {
  const start = `${Number(today.slice(0, 4)) - 1}-12-01`;
  const day = (n) =>
    [`${today.slice(0, 4)}-01-${String(n).padStart(2, "0")}`, today].sort()[0];
  const book = { version: 0, categories: [], revisions: [], audit: [] },
    actions = [];
  function apply(action) {
    const sequence = ++book.version,
      at = `${today}T00:00:00.000Z`;
    actions.push(action);
    book.audit.push({ version: sequence, at, action });
    if (action.type === "createCategory") {
      const rules = [
        {
          date: action.start,
          sequence,
          name: action.name,
          description: action.description,
          emoji: action.emoji,
          active: true,
        },
      ];
      book.categories.push({
        id: action.id,
        start: action.start,
        kind: action.kind,
        parentCategoryId: action.parentCategoryId ?? null,
        rules,
      });
      if (action.kind === "investment")
        book.categories.push({
          id: action.walletId,
          start,
          kind: "cash",
          parentCategoryId: action.id,
          rules: [
            {
              date: start,
              sequence,
              name: action.name,
              description: "",
              emoji: "💼",
              active: true,
            },
          ],
        });
    } else if (action.type === "postTransaction")
      book.revisions.push({
        id: action.transaction.id,
        rootId: action.transaction.id,
        sequence,
        at,
        transaction: action.transaction,
        reason: "",
      });
    else if (action.type === "reviseTransaction")
      book.revisions.push({
        id: `${action.transactionId}:${sequence}`,
        rootId: action.transactionId,
        sequence,
        at,
        transaction: action.replacement,
        reason: action.reason,
      });
  }
  const wallets = new Map();
  function category(name, emoji) {
    const id = randomUUID(),
      walletId = randomUUID();
    wallets.set(id, walletId);
    apply({
      type: "createCategory",
      id,
      walletId,
      parentCategoryId: null,
      start,
      kind: "investment",
      name,
      emoji,
      description,
    });
    return id;
  }
  function tx(categoryId, kind, date, fields) {
    const transaction = {
      id: randomUUID(),
      categoryId,
      kind,
      date,
      note: "Dữ liệu mẫu để review",
      counterparty: "",
      ...(["buy", "sell"].includes(kind)
        ? { fee: "0", tax: "0", cashCategoryId: wallets.get(categoryId) }
        : {}),
      ...fields,
    };
    apply({ type: "postTransaction", transaction });
    return transaction;
  }
  const stock = category("Cổ phiếu", "📈"),
    fund = category("Quỹ cổ phiếu", "🌿"),
    bond = category("Trái phiếu", "🏦"),
    crypto = category("Bitcoin", "₿"),
    closed = category("Quỹ chỉ số", "🌱");
  const cash = wallets.get(stock),
    exchange = wallets.get(crypto),
    other = randomUUID();
  apply({
    type: "createCategory",
    id: other,
    start,
    kind: "cash",
    parentCategoryId: stock,
    name: "Ví chứng khoán phụ",
    emoji: "💼",
    description,
  });
  for (const [id, cost, value] of [
    [stock, "0", "0"],
    [fund, "15000000", "16000000"],
    [bond, "5000000", "5050000"],
    [crypto, "7500000", "5700000"],
    [closed, "2000000", "2200000"],
  ])
    tx(id, "openingInvestment", start, { cost, value });
  tx(cash, "deposit", day(1), { amount: "10000000" });
  tx(stock, "buy", day(2), { amount: "7000000", value: "7000000" });
  tx(cash, "transfer", day(3), { amount: "500000", cashCategoryId: other });
  tx(other, "transfer", day(4), { amount: "500000", cashCategoryId: cash });
  tx(bond, "sell", day(5), {
    amount: "1100000",
    cost: "1000000",
    fee: "10000",
    value: "4040000",
  });
  tx(crypto, "sell", day(6), {
    amount: "8000000",
    cost: "7500000",
    value: "0",
  });
  tx(exchange, "withdraw", day(7), { amount: "1000000" });
  tx(crypto, "buy", day(8), {
    amount: "2000000",
    fee: "10000",
    value: "2200000",
  });
  tx(closed, "sell", day(9), {
    amount: "2300000",
    cost: "2000000",
    value: "0",
  });
  const valued = tx(stock, "valuation", `${today.slice(0, 7)}-01`, {
    value: "7900000",
  });
  apply({
    type: "reviseTransaction",
    transactionId: valued.id,
    replacement: { ...valued, value: "8000000" },
    reason: "Đối chiếu giá trị tài sản đã mua",
  });
  const duplicate = tx(cash, "deposit", day(10), {
    amount: "100000",
    note: "nhập thử",
  });
  apply({
    type: "reviseTransaction",
    transactionId: duplicate.id,
    replacement: null,
    reason: "Hủy khoản nạp ghi trùng",
  });
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
    const t =
        r.transaction ??
        book.revisions.find((o) => o.id === r.rootId)?.transaction,
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
