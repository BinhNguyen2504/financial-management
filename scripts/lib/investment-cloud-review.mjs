import { randomUUID } from "node:crypto";
import { REVIEW_FORMAT, validateUUID, vietnamToday } from "./review-data.mjs";
import { allReviewTables } from "./savings-review-data.mjs";
export const investmentTables = [
  "investments_books",
  "investments_categories",
  "investments_transactions",
  "investments_valuations",
  "investments_audit",
  "investments_commands",
];
export const completeReviewTables = [...allReviewTables, ...investmentTables];
export const investmentReviewDescription = (datasetId) =>
  `DỮ LIỆU MẪU UI/UX · ${REVIEW_FORMAT} · ${datasetId} · tham khảo investment-1.png/investment-2.png; lịch sử, phí, thuế và định giá chỉ minh họa.`;
/** Extend the existing marked review dataset; never replace its other modules. */
export function addInvestmentReviewData(base, { today = vietnamToday() } = {}) {
  validateUUID(base.ownerId);
  validateUUID(base.datasetId);
  if (base.format !== REVIEW_FORMAT || !base.savings?.categories.length)
    throw new Error("Cần bộ mẫu Thu nhập/Chi tiêu/Tiết kiệm trước đó.");
  if (
    !/^20\d{2}-\d{2}-\d{2}$/.test(today) ||
    new Date(`${today}T00:00:00Z`).toISOString().slice(0, 10) !== today ||
    today < "2001-01-01"
  )
    throw new Error("Ngày tạo mẫu không hợp lệ.");
  const year = Number(today.slice(0, 4)),
    start = `${year - 1}-12-01`,
    actions = [],
    at = `${today}T00:00:00.000Z`,
    description = investmentReviewDescription(base.datasetId);
  const day = (n, m = 1) =>
    [
      `${year}-${String(m).padStart(2, "0")}-${String(n).padStart(2, "0")}`,
      today,
    ].sort()[0];
  function create(name, kind, emoji) {
    const id = randomUUID();
    actions.push({
      type: "createCategory",
      id,
      start,
      kind,
      name,
      emoji,
      description,
    });
    return id;
  }
  function tx(categoryId, kind, date, fields = {}) {
    const transaction = {
      id: randomUUID(),
      categoryId,
      kind,
      date,
      note: "DỮ LIỆU MẪU UI/UX · giao dịch minh họa",
      counterparty: "",
      ...(["buy", "sell"].includes(kind)
        ? { fee: "0", tax: "0", cashCategoryId: null }
        : {}),
      ...fields,
    };
    actions.push({ type: "postTransaction", transaction });
    return transaction;
  }
  const cash = create("Tiền chờ TCBS", "cash", "💼"),
    exchange = create("Tiền chờ Crypto", "cash", "🌐"),
    stock = create("Cổ phiếu", "investment", "📈"),
    fund = create("Quỹ cổ phiếu", "investment", "🌿"),
    bond = create("Quỹ trái phiếu", "investment", "🏦"),
    crypto = create("Crypto", "investment", "🌐"),
    closed = create("Khoản đầu tư đã tất toán", "investment", "🍂"),
    loss = create("Khoản đầu tư mất toàn bộ vốn", "investment", "🪨");
  tx(cash, "openingCash", start, {
    amount: "12349",
    note: "DỮ LIỆU MẪU UI/UX · tham khảo tiền chờ 12.349 từ ảnh; không sử dụng giá trị 0/ROI −100% trong Notion.",
  });
  tx(exchange, "openingCash", start, { amount: "300000" });
  for (const [id, cost, value] of [
    [stock, "46293098", "44491500"],
    [fund, "11196750", "11509468"],
    [bond, "5005620", "5017437"],
    [crypto, "7500000", "5667000"],
    [closed, "2000000", "2100000"],
    [loss, "500000", "0"],
  ])
    tx(id, "openingInvestment", start, {
      cost,
      value,
      note: "DỮ LIỆU MẪU UI/UX · gốc/định giá tham khảo ảnh hoặc tự tạo; ngày mở đầu chỉ minh họa.",
    });
  let bondValue = 5017437n,
    stockValue = 44491500n;
  for (let m = 1; m <= Number(today.slice(5, 7)); m++) {
    tx(cash, "deposit", day(1, m), {
      amount: m === 1 ? "7000000" : "3000000",
      counterparty: "Techcombank (bên ngoài module)",
      note: `DỮ LIỆU MẪU UI/UX · góp DCA tháng ${m}`,
    });
    tx(bond, "buy", day(3, m), {
      amount: "1300000",
      fee: "1000",
      cashCategoryId: cash,
      value: (bondValue += 1310000n).toString(),
      note: `DỮ LIỆU MẪU UI/UX · quỹ TCBS tháng ${m}`,
    });
    if (m % 2 === 0)
      tx(stock, "buy", day(5, m), {
        amount: "412500",
        fee: "1000",
        cashCategoryId: cash,
        value: (stockValue += 420000n).toString(),
        note: "DỮ LIỆU MẪU UI/UX · HPG tham khảo ghi chú Notion; chỉ theo tổng danh mục, không theo số lượng mã.",
      });
    tx(bond, "valuation", day(15, m), {
      value: (bondValue += 15000n).toString(),
    });
    tx(stock, "valuation", day(15, m), {
      value: (stockValue += m % 2 === 0 ? 650000n : -350000n).toString(),
    });
  }
  tx(cash, "transfer", day(7), {
    amount: "1000000",
    cashCategoryId: exchange,
    note: "DỮ LIỆU MẪU UI/UX · chuyển giữa hai ví tiền chờ",
  });
  tx(crypto, "buy", day(8), {
    amount: "500000",
    fee: "5000",
    cashCategoryId: exchange,
    value: "6200000",
    note: "DỮ LIỆU MẪU UI/UX · BTC/ETH trong ghi chú, không theo mã",
  });
  tx(crypto, "sell", day(10), {
    amount: "300000",
    cost: "500000",
    fee: "10000",
    cashCategoryId: exchange,
    value: "5900000",
    note: "DỮ LIỆU MẪU UI/UX · bán một phần bị lỗ sau phí",
  });
  tx(fund, "buy", day(12), {
    amount: "1000000",
    value: "12600000",
    counterparty: "Mua trực tiếp từ bên ngoài",
    note: "DỮ LIỆU MẪU UI/UX · không qua ví tiền chờ",
  });
  tx(fund, "sell", day(13), {
    amount: "600000",
    cost: "500000",
    tax: "600",
    value: "12000000",
    counterparty: "Tiền bán về bên ngoài",
  });
  tx(stock, "sell", day(16), {
    amount: "3000000",
    cost: "2500000",
    fee: "3000",
    tax: "3000",
    cashCategoryId: cash,
    value: "42100000",
    note: "DỮ LIỆU MẪU UI/UX · bán lãi, vốn bán và tiền thực nhận khác nhau",
  });
  tx(cash, "withdraw", day(17), {
    amount: "500000",
    counterparty: "Techcombank (bên ngoài module)",
  });
  tx(closed, "sell", day(18), {
    amount: "2300000",
    cost: "2000000",
    fee: "5000",
    cashCategoryId: cash,
    value: "0",
  });
  actions.push({ type: "archiveCategory", categoryId: closed, date: day(18) });
  tx(loss, "sell", day(19), {
    amount: "0",
    cost: "500000",
    value: "0",
    note: "DỮ LIỆU MẪU UI/UX · tất toán mất vốn, tiền bán bằng 0",
  });
  actions.push({ type: "archiveCategory", categoryId: loss, date: day(19) });
  const amended = tx(fund, "valuation", day(20), {
    value: "12500000",
    note: "DỮ LIỆU MẪU UI/UX · định giá có lịch sử sửa",
  });
  actions.push({
    type: "reviseTransaction",
    transactionId: amended.id,
    replacement: { ...amended, value: "12700000" },
    reason: "DỮ LIỆU MẪU UI/UX · đối chiếu lại giá trị quỹ",
  });
  const cancelled = tx(cash, "deposit", day(21), {
    amount: "250000",
    note: "DỮ LIỆU MẪU UI/UX · nhập thử, sau đó hủy",
  });
  actions.push({
    type: "reviseTransaction",
    transactionId: cancelled.id,
    replacement: null,
    reason: "DỮ LIỆU MẪU UI/UX · hủy khoản ghi trùng",
  });
  const book = { version: 0, categories: [], revisions: [], audit: [] };
  for (const action of actions) {
    const seq = ++book.version;
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
    } else if (action.type === "reviseTransaction")
      book.revisions.push({
        id: `${action.transactionId}:${seq}`,
        rootId: action.transactionId,
        sequence: seq,
        at,
        transaction: action.replacement,
        reason: action.reason,
      });
    else if (action.type === "archiveCategory") {
      const c = book.categories.find((c) => c.id === action.categoryId);
      c.rules.push({
        ...c.rules[0],
        date: action.date,
        sequence: seq,
        active: false,
      });
    }
  }
  return {
    ...base,
    investmentToday: today,
    investments: book,
    investmentsSource: {
      images: ["Notion/investment-1.png", "Notion/investment-2.png"],
      syntheticTransactions: true,
      notice:
        "Các số gốc/giá trị tham khảo Notion, bổ sung số mẫu và ngày minh họa; không phải số dư hoặc giao dịch thật.",
    },
  };
}
const literal = (v) =>
  v === null
    ? "null"
    : typeof v === "number"
      ? String(v)
      : `'${(typeof v === "string" ? v : JSON.stringify(v)).replaceAll("'", "''")}'`;
export function buildInvestmentCloudReviewSQL(
  data,
  { runtime = false, migrationSQL = "" } = {},
) {
  validateUUID(data.ownerId);
  validateUUID(data.datasetId);
  if (
    data.format !== REVIEW_FORMAT ||
    !data.investments?.categories.length ||
    !data.savings?.categories.length
  )
    throw new Error("Sai bộ dữ liệu review.");
  const prefix =
      "begin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nset local standard_conforming_strings=on;\n",
    declarations = `review_owner constant uuid := ${literal(data.ownerId)}::uuid;\nreview_dataset constant text := ${literal(data.datasetId)};`,
    locks = `perform pg_advisory_xact_lock(hashtextextended(review_owner::text,0));\n${["income:", "savings:", "investments:"].map((p) => `perform pg_advisory_xact_lock(hashtextextended('${p}'||review_owner::text,0));`).join("\n")}`;
  const oldMarker = (t) =>
    `exists(select 1 from public.${t} where owner_id=review_owner and action='seedReviewData' and detail->>'format'=${literal(REVIEW_FORMAT)} and detail->>'datasetId'=review_dataset)`;
  const savingsMarker = `exists(select 1 from public.savings_audit where owner_id=review_owner and action->>'type'='createCategory' and action->>'description'=${literal(data.savings.categories[0].rules[0].description)})`;
  const investmentMarker = `exists(select 1 from public.investments_audit where owner_id=review_owner and action->>'type'='createCategory' and action->>'description'=${literal(investmentReviewDescription(data.datasetId))})`;
  const previousMarkers = `${oldMarker("expense_audit")} and ${oldMarker("income_audit")} and ${savingsMarker}`,
    allMarked = `${previousMarkers} and ${investmentMarker}`;
  const insert = (table, columns, values) =>
    `insert into public.${table}(owner_id,${columns.join(",")}) values(review_owner,${values.map(literal).join(",")});`;
  const b = data.investments,
    inserts = [
      insert("investments_books", ["version"], [b.version]),
      ...b.categories.map((c) =>
        insert("investments_categories", ["id", "data"], [c.id, c]),
      ),
    ];
  for (const r of b.revisions) {
    const original = b.revisions.find(
      (x) => x.rootId === r.rootId && x.id === x.rootId,
    )?.transaction;
    if (!original) throw new Error("Thiếu giao dịch gốc.");
    const t = r.transaction ?? original;
    inserts.push(
      insert(
        original.kind === "valuation"
          ? "investments_valuations"
          : "investments_transactions",
        [
          "id",
          "root_id",
          "sequence",
          "category_id",
          "cash_category_id",
          "data",
        ],
        [r.id, r.rootId, r.sequence, t.categoryId, t.cashCategoryId ?? null, r],
      ),
    );
  }
  inserts.push(
    ...b.audit.map((a) =>
      insert(
        "investments_audit",
        ["version", "at", "action"],
        [a.version, a.at, a.action],
      ),
    ),
  );
  const body = `do $investment_review$ declare ${declarations}\nbegin\n${locks}\nif not (${previousMarkers}) then raise exception 'Matching existing review markers required; previous modules are never overwritten.';end if;\nif ${investmentMarker} then raise notice 'Investment review already installed; preserving review edits.';return;end if;\nif ${investmentTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or ")} then raise exception 'Investments already has data; nothing imported.';end if;\n${inserts.join("\n")}\nend;$investment_review$;\n`;
  const role = runtime
    ? `do $role$ begin if session_user<>'expense_api' then raise exception 'Expected expense_api runtime connection';end if;end;$role$;\nset local role authenticated;\nselect set_config('request.jwt.claims',${literal({ sub: data.ownerId, role: "authenticated" })},true);\n`
    : "";
  const seed = prefix + role + body + "commit;\n";
  const snapshot = `jsonb_build_object('format','financial-manager-owner-backup-v3','ownerId',review_owner,'datasetId',review_dataset,'exportedAt',clock_timestamp(),'tables',jsonb_build_object(${completeReviewTables.map((t) => `${literal(t)},coalesce((select jsonb_agg(to_jsonb(r)) from public.${t} r where owner_id=review_owner),'[]'::jsonb)`).join(",")}))`;
  const backup =
    prefix +
    `set transaction isolation level repeatable read;\ndo $backup$ declare ${declarations} begin drop table if exists pg_temp.fm_review_backup;create temp table fm_review_backup on commit preserve rows as select ${snapshot} as backup;end;$backup$;commit;select backup from pg_temp.fm_review_backup;`;
  const triggers = [
    ["expense_years", "expense_year_sealed"],
    ["expense_audit", "expense_audit_immutable"],
    ["expense_commands", "expense_commands_immutable"],
    ["income_audit", "income_audit_immutable"],
    ["income_commands", "income_commands_immutable"],
    ...allReviewTables
      .filter(
        (t) =>
          t.startsWith("savings_") &&
          !["savings_books", "savings_categories"].includes(t),
      )
      .map((t) => [t, "savings_history_immutable"]),
    ...investmentTables
      .filter(
        (t) => !["investments_books", "investments_categories"].includes(t),
      )
      .map((t) => [t, "investments_history_immutable"]),
  ];
  const order = [
    "investments_commands",
    "investments_audit",
    "investments_valuations",
    "investments_transactions",
    "investments_categories",
    "investments_books",
    "savings_commands",
    "savings_closes",
    "savings_prices",
    "savings_allocations",
    "savings_audit",
    "savings_transactions",
    "savings_categories",
    "savings_books",
    "expense_commands",
    "expense_audit",
    "expense_years",
    "expense_labels",
    "expense_spends",
    "expense_month_inputs",
    "expense_jars",
    "expense_books",
    "income_commands",
    "income_audit",
    "income_monthly",
    "income_oneoffs",
    "income_categories",
    "income_books",
  ];
  const reset =
    prefix +
    `-- NEVER RUN until UI/UX approval and backup export.\ndo $reset$ declare ${declarations}\nconfirmation constant text := 'NOT_CONFIRMED';begin\nif confirmation <> 'RESET REVIEW '||review_owner::text then raise exception 'Reset not confirmed. Export backup and confirm owner first.';end if;\n${locks}\nif not (${allMarked}) then raise exception 'Matching review markers missing; nothing deleted.';end if;\nlock table ${completeReviewTables.map((t) => `public.${t}`).join(",")} in share row exclusive mode;\ndrop table if exists pg_temp.fm_review_reset_backup;create temp table fm_review_reset_backup on commit preserve rows as select ${snapshot} as backup;\n${triggers.map(([t, tr]) => `alter table public.${t} disable trigger ${tr};`).join("\n")}\n${order.map((t) => `delete from public.${t} where owner_id=review_owner;`).join("\n")}\n${triggers.map(([t, tr]) => `alter table public.${t} enable trigger ${tr};`).join("\n")}\nif ${completeReviewTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or ")} then raise exception 'Reset verification failed';end if;end;$reset$;commit;select backup as backup_before_reset from pg_temp.fm_review_reset_backup;`;
  const inspect =
    prefix +
    `do $inspect$ declare ${declarations} begin drop table if exists pg_temp.fm_review_inspect;create temp table fm_review_inspect on commit preserve rows as select (${allMarked}) as matching_review_dataset,jsonb_build_object(${completeReviewTables.map((t) => `${literal(t)},(select count(*) from public.${t} where owner_id=review_owner)`).join(",")}) as counts;end;$inspect$;commit;select * from pg_temp.fm_review_inspect;`;
  const enable = migrationSQL
    ? prefix +
      `do $enable_investments$ begin if ${investmentTables.map((t) => `to_regclass('public.${t}') is null`).join(" and ")} then execute ${literal(migrationSQL)};elsif ${investmentTables.map((t) => `to_regclass('public.${t}') is null`).join(" or ")} then raise exception 'Partial investment schema; inspect migrations before importing.';end if;end;$enable_investments$;\n` +
      body +
      "commit;\n"
    : null;
  return { seed, backup, reset, inspect, enable };
}
