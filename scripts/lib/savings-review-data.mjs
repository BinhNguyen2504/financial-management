import { randomUUID } from "node:crypto";
import {
  REVIEW_FORMAT,
  reviewTables as legacyTables,
  validateUUID,
  vietnamToday,
} from "./review-data.mjs";

export const savingsTables = [
  "savings_books",
  "savings_categories",
  "savings_transactions",
  "savings_allocations",
  "savings_prices",
  "savings_closes",
  "savings_audit",
  "savings_commands",
];
export const allReviewTables = [...legacyTables, ...savingsTables];
const description = (id) =>
  `DỮ LIỆU MẪU UI/UX · ${REVIEW_FORMAT} · ${id} · tham khảo saving.png; giao dịch và đơn vị vàng chỉ minh họa, không phải tài sản thật.`;

/** Event fixtures only. Balances, lots, valuations and P&L are calculated by the app. */
export function addSavingsReviewData(base, { today = vietnamToday() } = {}) {
  validateUUID(base.ownerId);
  validateUUID(base.datasetId);
  if (
    !/^20\d{2}-\d{2}-\d{2}$/.test(today) ||
    new Date(`${today}T00:00:00Z`).toISOString().slice(0, 10) !== today
  )
    throw new Error("Ngày tạo mẫu không hợp lệ.");
  const y = Number(today.slice(0, 4)),
    current = Number(today.slice(5, 7)),
    start = `${y - 1}-12`,
    opening = `${start}-01`;
  if (y <= 2000) throw new Error("Bộ mẫu nhiều năm cần năm từ 2001.");
  const book = {
    version: 0,
    categories: [],
    revisions: [],
    prices: [],
    closes: [],
    audit: [],
  };
  const memo = description(base.datasetId),
    at = `${today}T00:00:00.000Z`;
  function record(action) {
    const sequence = ++book.version;
    book.audit.push({ version: sequence, at, action });
    return sequence;
  }
  function category(name, kind, emoji) {
    const id = randomUUID();
    const a = {
      type: "createCategory",
      id,
      start,
      kind,
      unit: kind === "gold" ? "chỉ" : null,
      name,
      description: memo,
      emoji,
    };
    record(a);
    book.categories.push({
      id,
      start,
      kind,
      unit: a.unit,
      rules: [{ month: start, name, description: memo, emoji, active: true }],
    });
    return id;
  }
  function config(id, month, active, name) {
    const c = book.categories.find((c) => c.id === id),
      r = { ...c.rules.at(-1), month, active, ...(name ? { name } : {}) };
    record(
      active
        ? {
            type: "configureCategory",
            categoryId: id,
            month,
            name: r.name,
            description: r.description,
            emoji: r.emoji,
          }
        : { type: "archiveCategory", categoryId: id, month },
    );
    c.rules.push(r);
  }
  function tx(kind, categoryId, date, fields) {
    const id = randomUUID(),
      t = { id, kind, categoryId, date, note: memo, ...fields };
    const sequence = record({ type: "postTransaction", transaction: t });
    book.revisions.push({
      id,
      rootId: id,
      sequence,
      transaction: t,
      reason: "",
    });
    return id;
  }
  function price(categoryId, date, value) {
    const id = randomUUID(),
      sequence = record({
        type: "setPrice",
        id,
        categoryId,
        date,
        price: value,
      });
    book.prices.push({ id, categoryId, date, price: value, sequence });
  }
  const momo = category("Ví thần tài MoMo", "cash", "💰"),
    vib = category("VIB", "cash", "🏦"),
    tech = category("Techcombank", "deposit", "🏦"),
    gold = category("Vàng", "gold", "🪙"),
    old = category("Sổ tiết kiệm cũ", "deposit", "🌱"),
    reserve = category("Vàng nhẫn dự phòng", "gold", "💛");
  // Six visible historical prices total 62.2m in the screenshot. Quantity/unit
  // and business dates are explicit synthetic assumptions for UI review.
  const lots = [8400000, 9400000, 11400000, 10900000, 11000000, 11100000].map(
    (amount) =>
      tx("openingGold", gold, opening, {
        amount: String(amount),
        quantity: "1",
        unitPrice: "11000000",
      }),
  );
  tx("openingGold", reserve, opening, {
    amount: "5500000",
    quantity: "0.5",
    unitPrice: "11000000",
  });
  let contract = tx("openingDeposit", tech, opening, {
    amount: "100000000",
    name: "Sổ Techcombank · gốc tham khảo Notion",
    maturity: `${y}-03-01`,
    term: "3 tháng · mẫu",
  });
  const previous = tx("openingDeposit", old, opening, {
    amount: "12000000",
    name: "Sổ minh họa đã tất toán",
    maturity: `${y}-01-01`,
    term: "Minh họa",
  });
  tx("withdrawDeposit", old, `${y}-01-01`, {
    contractId: previous,
    amount: "12000000",
    interest: "120000",
    fee: "0",
    tax: "0",
    cashCategoryId: momo,
  });
  tx("buyGold", gold, `${y}-01-01`, {
    quantity: "1",
    unitPrice: "17300000",
    fee: "0",
    tax: "0",
    cashCategoryId: null,
  });
  if (current >= 2) config(old, `${y}-02`, false);
  for (let n = 1; n <= current; n++) {
    const date = `${y}-${String(n).padStart(2, "0")}-01`;
    tx("deposit", momo, date, { amount: String(1000000 + n * 100000) });
    tx("transfer", momo, date, {
      amount: "500000",
      cashCategoryId: vib,
      fee: "0",
      tax: "0",
    });
    if (n === 3) {
      const due = new Date(`${today}T00:00:00Z`);
      due.setUTCDate(due.getUTCDate() + 3);
      contract = tx("rollover", tech, date, {
        contractId: contract,
        name: "Sổ Techcombank tái tục",
        maturity: due.toISOString().slice(0, 10),
        term: "Đáo hạn trong 3 ngày · mẫu",
        interest: "1800000",
        reinvestInterest: "1000000",
        fee: "0",
        tax: "0",
        cashCategoryId: momo,
      });
      config(gold, `${y}-03`, true, "Vàng tích lũy");
    }
    tx("interest", tech, date, {
      contractId: contract,
      amount: "100000",
      capitalize: n % 2 === 1,
      cashCategoryId: n % 2 === 1 ? null : momo,
    });
    if (n === 5)
      tx("sellGold", gold, date, {
        unitPrice: "14800000",
        allocations: [{ lotId: lots[0], quantity: "0.5" }],
        fee: "100000",
        tax: "0",
        cashCategoryId: momo,
      });
    if (n === 7)
      tx("buyGold", gold, date, {
        quantity: "0.25",
        unitPrice: "15200000",
        fee: "0",
        tax: "0",
        cashCategoryId: momo,
      });
    price(gold, date, String(11400000 + n * 600000));
  }
  if (current >= 4)
    tx("withdraw", vib, `${today.slice(0, 7)}-01`, {
      amount: "1500000",
      fee: "0",
      tax: "0",
    });
  tx("fee", momo, `${today.slice(0, 7)}-01`, { amount: "10000" });
  return {
    ...base,
    today,
    savings: book,
    savingsSource: {
      image: "Notion/saving.png",
      openingGoldCost: "62200000",
      techcombankPrincipal: "100000000",
      unitAssumption: "chỉ — chỉ để review, chưa xác nhận từ ảnh",
      syntheticTransactions: true,
    },
  };
}

const literal = (v) =>
  v === null
    ? "null"
    : typeof v === "number"
      ? String(v)
      : `'${(typeof v === "string" ? v : JSON.stringify(v)).replaceAll("'", "''")}'`;
const marker = (t) =>
  `exists(select 1 from public.${t} where owner_id=review_owner and action='seedReviewData' and detail->>'format'=${literal(REVIEW_FORMAT)} and detail->>'datasetId'=review_dataset)`;
// All identifiers are a fixed allowlist; owner/dataset UUIDs are validated above.
export function buildSavingsReviewSQL(
  data,
  { runtime = false, migrationSQL = "" } = {},
) {
  validateUUID(data.ownerId);
  validateUUID(data.datasetId);
  if (!data.savings?.categories.length)
    throw new Error("Bộ mẫu chưa có Tiết kiệm.");
  const preamble = `begin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nset local standard_conforming_strings=on;\n`;
  const declarations = `review_owner constant uuid := ${literal(data.ownerId)}::uuid;\nreview_dataset constant text := ${literal(data.datasetId)};`;
  const lock = `perform pg_advisory_xact_lock(hashtextextended(review_owner::text,0));\nperform pg_advisory_xact_lock(hashtextextended('income:'||review_owner::text,0));\nperform pg_advisory_xact_lock(hashtextextended('savings:'||review_owner::text,0));`;
  const marked = `exists(select 1 from public.savings_audit where owner_id=review_owner and action->>'type'='createCategory' and action->>'description'=${literal(description(data.datasetId))})`;
  const allMarked = `${marker("expense_audit")} and ${marker("income_audit")} and ${marked}`;
  function insert(table, columns, rows) {
    return rows.length
      ? `insert into public.${table}(owner_id,${columns.join(",")}) values\n${rows.map((r) => `(review_owner,${r.map(literal).join(",")})`).join(",\n")};`
      : "";
  }
  const b = data.savings;
  const inserts = [
    insert("savings_books", ["version"], [[b.version]]),
    insert(
      "savings_categories",
      ["id", "data"],
      b.categories.map((c) => [c.id, c]),
    ),
  ];
  for (const r of b.revisions) {
    const t = r.transaction;
    inserts.push(
      insert(
        "savings_transactions",
        [
          "id",
          "root_id",
          "sequence",
          "category_id",
          "cash_category_id",
          "contract_id",
          "data",
        ],
        [
          [
            r.id,
            r.rootId,
            r.sequence,
            t.categoryId,
            t.cashCategoryId ?? null,
            t.contractId ?? null,
            r,
          ],
        ],
      ),
    );
    if (t.kind === "sellGold")
      inserts.push(
        insert(
          "savings_allocations",
          ["revision_id", "lot_id"],
          t.allocations.map((a) => [r.id, a.lotId]),
        ),
      );
  }
  inserts.push(
    insert(
      "savings_prices",
      ["id", "category_id", "sequence", "data"],
      b.prices.map((p) => [p.id, p.categoryId, p.sequence, p]),
    ),
  );
  inserts.push(
    insert(
      "savings_audit",
      ["version", "at", "action"],
      b.audit.map((a) => [a.version, a.at, a.action]),
    ),
  );
  const body = `do $savings_review$ declare ${declarations}\nbegin\n${lock}\nif not (${marker("expense_audit")} and ${marker("income_audit")}) then raise exception 'Matching existing review dataset required; ordinary financial data is never overwritten.';end if;\nif ${marked} then raise notice 'Savings review dataset already installed; preserving review edits.';return;end if;\nif ${savingsTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or ")} then raise exception 'Savings already has data; nothing imported.';end if;\n${inserts.join("\n")}\nend; $savings_review$;\n`;
  const seed =
    preamble +
    (runtime
      ? `do $role$ begin if session_user<>'expense_api' then raise exception 'Expected expense_api runtime connection';end if;end;$role$;\nset local role authenticated;\nselect set_config('request.jwt.claims',${literal({ sub: data.ownerId, role: "authenticated" })},true);\n`
      : "") +
    body +
    "commit;\n";
  const snapshot = `jsonb_build_object('format','financial-manager-owner-backup-v2','ownerId',review_owner,'datasetId',review_dataset,'exportedAt',clock_timestamp(),'tables',jsonb_build_object(${allReviewTables.map((t) => `${literal(t)},coalesce((select jsonb_agg(to_jsonb(r)) from public.${t} r where owner_id=review_owner),'[]'::jsonb)`).join(",")}))`;
  const backup =
    preamble +
    `set transaction isolation level repeatable read;\ndo $backup$ declare ${declarations} begin drop table if exists pg_temp.fm_review_backup;create temp table fm_review_backup on commit preserve rows as select ${snapshot} as backup;end;$backup$;commit;select backup from pg_temp.fm_review_backup;`;
  const triggers = [
    ["expense_years", "expense_year_sealed"],
    ["expense_audit", "expense_audit_immutable"],
    ["expense_commands", "expense_commands_immutable"],
    ["income_audit", "income_audit_immutable"],
    ["income_commands", "income_commands_immutable"],
    ...savingsTables
      .filter((t) => !["savings_books", "savings_categories"].includes(t))
      .map((t) => [t, "savings_history_immutable"]),
  ];
  const order = [
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
    preamble +
    `-- NEVER run until UI/UX is approved and a backup is exported.\ndo $reset$ declare ${declarations}\nconfirmation constant text := 'NOT_CONFIRMED';begin\nif confirmation <> 'RESET REVIEW '||review_owner::text then raise exception 'Reset not confirmed. Export backup and confirm the owner first.';end if;\n${lock}\nif not (${allMarked}) then raise exception 'Matching review markers missing; nothing deleted.';end if;\nlock table ${allReviewTables.map((t) => `public.${t}`).join(",")} in share row exclusive mode;\ndrop table if exists pg_temp.fm_review_reset_backup;create temp table fm_review_reset_backup on commit preserve rows as select ${snapshot} as backup;\n${triggers.map(([t, tr]) => `alter table public.${t} disable trigger ${tr};`).join("\n")}\n${order.map((t) => `delete from public.${t} where owner_id=review_owner;`).join("\n")}\n${triggers.map(([t, tr]) => `alter table public.${t} enable trigger ${tr};`).join("\n")}\nif ${allReviewTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or ")} then raise exception 'Reset verification failed';end if;end;$reset$;commit;select backup as backup_before_reset from pg_temp.fm_review_reset_backup;`;
  const inspect =
    preamble +
    `do $inspect$ declare ${declarations} begin drop table if exists pg_temp.fm_review_inspect;create temp table fm_review_inspect on commit preserve rows as select (${allMarked}) as matching_review_dataset,jsonb_build_object(${allReviewTables.map((t) => `${literal(t)},(select count(*) from public.${t} where owner_id=review_owner)`).join(",")}) as counts;end;$inspect$;commit;select * from pg_temp.fm_review_inspect;`;
  const enable = migrationSQL
    ? preamble +
      `do $enable_savings$ begin\nif ${savingsTables.map((t) => `to_regclass('public.${t}') is null`).join(" and ")} then execute ${literal(migrationSQL)};\nelsif ${savingsTables.map((t) => `to_regclass('public.${t}') is null`).join(" or ")} then raise exception 'Partial savings schema; inspect migrations before importing.';end if;end;$enable_savings$;\n` +
      body +
      "commit;\n"
    : null;
  return { seed, backup, reset, inspect, enable };
}
