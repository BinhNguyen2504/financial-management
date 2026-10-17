import { randomUUID } from "node:crypto";

export const REVIEW_FORMAT = "financial-manager-ui-review-v1";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUUID(value) {
  if (!uuid.test(value))
    throw new Error("User UID/dataset ID phải là UUID hợp lệ.");
  return value;
}

export function vietnamToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Names/methods/amounts reference the supplied Notion screenshots. Balances and
// transactions are deliberately synthetic, not an accounting migration.
const jarDefinitions = [
  ["Thúy đại học", "MoMo", "Gia đình", "accumulation", 4000000, "📚"],
  ["Tiền nhà cho thuê", "Cash", "Gia đình", "monthly", 2700000, "🏡"],
  ["Ăn uống & cà phê", "Timo", "Bản thân", "monthly", 2000000, "🍜"],
  ["Mượn bác Thịnh", "Cash", "Gia đình", "accumulation", 2000000, "🫙"],
  ["Phí sinh hoạt", "Cash", "Bản thân", "monthly", 2000000, "🏡"],
  ["Các mối quan hệ", "MoMo", "Bản thân", "monthly", 1500000, "🎁"],
  ["Mua sắm", "HSBC", "Bản thân", "monthly", 1000000, "🛒"],
  ["Hóa đơn điện", "MoMo", "Gia đình", "monthly", 800000, "💡"],
  ["Đồ gia dụng", "MoMo", "Gia đình", "accumulation", 500000, "🛒"],
  ["Du lịch", "MoMo", "Bản thân", "accumulation", 500000, "✈️"],
  ["Lãi dì hai", "MoMo", "Gia đình", "accumulation", 500000, "🫙"],
  ["Bỏ bóp chi tiêu", "Cash", "Bản thân", "monthly", 200000, "🫙"],
  ["Hóa đơn nước", "MoMo", "Gia đình", "monthly", 200000, "💡"],
  ["YouTube Premium", "HSBC", "Bản thân", "monthly", 170000, "🎨"],
  ["Hóa đơn thu rác", "Cash", "Gia đình", "monthly", 100000, "💡"],
  ["Cắt tóc", "MoMo", "Bản thân", "monthly", 90000, "🫙"],
  ["Internet", "ShopeePay", "Gia đình", "monthly", 70000, "💡"],
  ["iCloud", "ShopeePay", "Bản thân", "monthly", 20000, "💡"],
];

export function buildReviewData({
  ownerId,
  today = vietnamToday(),
  datasetId = randomUUID(),
}) {
  validateUUID(ownerId);
  validateUUID(datasetId);
  if (
    !/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(today) ||
    new Date(`${today}T00:00:00Z`).toISOString().slice(0, 10) !== today
  )
    throw new Error("Ngày tạo mẫu không hợp lệ.");
  const year = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const start = `${year}-01`;
  const at = `${today}T00:00:00.000Z`;
  const marker = { format: REVIEW_FORMAT, datasetId, synthetic: true };
  const description =
    "DỮ LIỆU MẪU UI/UX · tham khảo Notion, không phải số dư/giao dịch thật.";
  const expenses = {
    start,
    version: 1,
    jars: [],
    inputs: [],
    spends: [],
    labels: [],
    years: [{ year, closedAt: null, snapshot: null }],
    audit: [{ version: 1, at, action: "seedReviewData", detail: marker }],
  };
  for (const [
    index,
    [name, method, group, kind, amount, emoji],
  ] of jarDefinitions.entries()) {
    const id = randomUUID();
    expenses.jars.push({
      id,
      kind,
      start,
      opening: "0",
      rules: [
        {
          month: start,
          name,
          description,
          method,
          group,
          amount: String(amount),
          emoji,
          active: true,
        },
      ],
    });
    for (let n = 1; n <= currentMonth; n++) {
      const month = `${year}-${String(n).padStart(2, "0")}`;
      if (kind === "monthly") {
        const remaining =
          n === currentMonth
            ? 45 + (index % 4) * 10
            : 5 + ((n + index) % 4) * 5;
        // Shopping includes extra funding and spending above target.
        const over = name === "Mua sắm" && n % 3 === currentMonth % 3;
        expenses.inputs.push({
          jarId: id,
          month,
          target: null,
          funding: null,
          extra: over ? String(amount / 2) : "0",
          closing: String(Math.floor(amount * (over ? 0.1 : remaining / 100))),
        });
      } else {
        expenses.inputs.push({
          jarId: id,
          month,
          target: null,
          funding: null,
          extra: "0",
          closing: null,
        });
        if (n % 3 === 0 || n === currentMonth)
          expenses.spends.push({
            id: randomUUID(),
            jarId: id,
            date: `${month}-01`,
            amount: String(amount),
            note: `MẪU · sử dụng hũ ${name}`,
            deleted: false,
          });
      }
    }
  }
  for (const [kind, values] of [
    ["method", [...new Set(jarDefinitions.map((j) => j[1]))]],
    ["group", [...new Set(jarDefinitions.map((j) => j[2]))]],
  ])
    for (const name of values)
      expenses.labels.push({ id: randomUUID(), kind, name });

  const income = {
    version: 1,
    categories: [],
    monthly: [],
    oneOffs: [],
    audit: [{ version: 1, at, action: "seedReviewData", detail: marker }],
  };
  const salary = randomUUID(),
    rent = randomUUID();
  for (const [id, name] of [
    [salary, "Lương FSOFT"],
    [rent, "Tiền nhà"],
  ])
    income.categories.push({
      id,
      start,
      deleted: false,
      rules: [{ month: start, name, description, active: true }],
    });
  for (let n = 1; n <= currentMonth; n++) {
    const month = `${year}-${String(n).padStart(2, "0")}`;
    for (const [categoryId, amount] of [
      [salary, n < 3 ? "0" : "19000000"],
      [rent, "2600000"],
    ]) {
      const record = { categoryId, month, amount, note: description };
      income.monthly.push(record);
      income.version++;
      // Retain setMonthly history so clearing a sample receipt still prevents
      // deleting its category, just like receipts entered through the app.
      income.audit.push({
        version: income.version,
        at,
        action: "setMonthly",
        detail: { action: { type: "setMonthly", ...record }, before: null },
      });
    }
    if (n === 1 || n === 3 || n === currentMonth)
      income.oneOffs.push({
        id: randomUUID(),
        month,
        name: "Freelance / Thưởng",
        description,
        amount: n === 1 ? "14500000" : n === 3 ? "11000000" : "3500000",
        deleted: false,
      });
  }
  return {
    format: REVIEW_FORMAT,
    datasetId,
    ownerId,
    today,
    currency: "VND",
    notice: description,
    source:
      "Notion/income.png, Notion/expenses-1.png, Notion/expenses-2.png và ảnh Expenses bổ sung trong chat",
    expenses,
    income,
  };
}

// Fixed allowlist, shared by seed/backup/reset. No table names come from CLI input.
export const reviewTables = [
  "expense_books",
  "expense_jars",
  "expense_month_inputs",
  "expense_spends",
  "expense_years",
  "expense_labels",
  "expense_audit",
  "expense_commands",
  "income_books",
  "income_categories",
  "income_monthly",
  "income_oneoffs",
  "income_audit",
  "income_commands",
];
const protectedTriggers = [
  ["expense_years", "expense_year_sealed"],
  ["expense_audit", "expense_audit_immutable"],
  ["expense_commands", "expense_commands_immutable"],
  ["income_audit", "income_audit_immutable"],
  ["income_commands", "income_commands_immutable"],
];
const deletionOrder = [
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
function literal(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number")
    return String(value);
  return `'${(typeof value === "string" ? value : JSON.stringify(value)).replaceAll("'", "''")}'`;
}
function insert(table, columns, rows) {
  if (!rows.length) return "";
  return (
    `insert into public.${table}(owner_id,${columns.join(",")}) values\n` +
    rows
      .map((row) => `  (review_owner,${row.map(literal).join(",")})`)
      .join(",\n") +
    ";"
  );
}
function markerCheck(table) {
  return `exists (select 1 from public.${table} where owner_id=review_owner and action='seedReviewData' and detail->>'format'=${literal(REVIEW_FORMAT)} and detail->>'datasetId'=review_dataset)`;
}
function countSQL() {
  return reviewTables
    .map(
      (t) =>
        `${literal(t)},(select count(*) from public.${t} where owner_id=review_owner)`,
    )
    .join(",\n");
}
function snapshotSQL() {
  return (
    `jsonb_build_object('format','financial-manager-owner-backup-v1','ownerId',review_owner,'datasetId',review_dataset,'exportedAt',clock_timestamp(),'tables',jsonb_build_object(\n` +
    reviewTables
      .map(
        (t) =>
          `${literal(t)},coalesce((select jsonb_agg(to_jsonb(r)) from public.${t} r where owner_id=review_owner),'[]'::jsonb)`,
      )
      .join(",\n") +
    "))"
  );
}

export function buildReviewSQL(data, { runtime = false } = {}) {
  validateUUID(data.ownerId);
  validateUUID(data.datasetId);
  const preamble = `-- Financial Manager UI review. Synthetic data; run in Supabase SQL Editor as postgres/admin.\n-- Owner: ${data.ownerId}\n-- Dataset: ${data.datasetId}\nbegin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nset local standard_conforming_strings=on;\n`;
  const declarations = `review_owner constant uuid := ${literal(data.ownerId)}::uuid;\nreview_dataset constant text := ${literal(data.datasetId)};`;
  const lock = `perform pg_advisory_xact_lock(hashtextextended(review_owner::text,0));\nperform pg_advisory_xact_lock(hashtextextended('income:' || review_owner::text,0));`;
  const bothMarked = `${markerCheck("expense_audit")} and ${markerCheck("income_audit")}`;
  const e = data.expenses,
    i = data.income;
  const seedPreamble =
    preamble +
    (runtime
      ? `do $role$ begin if session_user <> 'expense_api' then raise exception 'Expected expense_api runtime connection'; end if; end; $role$;\nset local role authenticated;\nselect set_config('request.jwt.claims',${literal({ sub: data.ownerId, role: "authenticated" })},true);\n`
      : "");
  const reusableTables = [
    "expense_books",
    "expense_years",
    "expense_audit",
    "expense_commands",
  ];
  const reusable = `exists(select 1 from public.expense_books where owner_id=review_owner and version=1 and left(start_month,4)=${literal(e.start.slice(0, 4))})
    and (select count(*) from public.expense_audit where owner_id=review_owner)=1
    and exists(select 1 from public.expense_audit where owner_id=review_owner and version=1 and action='initialize' and detail->>'type'='initialize')
    and (select count(*) from public.expense_years where owner_id=review_owner)=1
    and exists(select 1 from public.expense_years where owner_id=review_owner and year=${Number(e.start.slice(0, 4))} and closed_at is null and snapshot is null)
    and (select count(*) from public.expense_commands where owner_id=review_owner)<=1
    and not exists(select 1 from public.expense_commands where owner_id=review_owner and result->>'version' is distinct from '1')`;
  const inserts = [
    `if reuse_empty_expense then\nupdate public.expense_books set start_month=${literal(e.start)},version=2 where owner_id=review_owner;\nelse\n${insert("expense_books", ["start_month", "version"], [[e.start, e.version]])}\nend if;`,
    insert(
      "expense_jars",
      ["id", "kind", "start_month", "opening", "rules"],
      e.jars.map((j) => [j.id, j.kind, j.start, j.opening, j.rules]),
    ),
    insert(
      "expense_month_inputs",
      ["jar_id", "month", "target", "funding", "extra", "closing"],
      e.inputs.map((r) => [
        r.jarId,
        r.month,
        r.target,
        r.funding,
        r.extra,
        r.closing,
      ]),
    ),
    insert(
      "expense_spends",
      ["id", "jar_id", "date", "amount", "note", "deleted"],
      e.spends.map((r) => [r.id, r.jarId, r.date, r.amount, r.note, r.deleted]),
    ),
    `if not reuse_empty_expense then\n` +
      insert(
        "expense_years",
        ["year", "closed_at", "snapshot"],
        e.years.map((r) => [r.year, r.closedAt, r.snapshot]),
      ) +
      "\nend if;",
    insert(
      "expense_labels",
      ["id", "kind", "name"],
      e.labels.map((r) => [r.id, r.kind, r.name]),
    ),
    `insert into public.expense_audit(owner_id,version,at,action,detail) values(review_owner,case when reuse_empty_expense then 2 else 1 end,${literal(e.audit[0].at)},'seedReviewData',${literal(e.audit[0].detail)});`,
    insert("income_books", ["version"], [[i.version]]),
    insert(
      "income_categories",
      ["id", "start_month", "deleted", "rules"],
      i.categories.map((r) => [r.id, r.start, r.deleted, r.rules]),
    ),
    insert(
      "income_monthly",
      ["category_id", "month", "amount", "note"],
      i.monthly.map((r) => [r.categoryId, r.month, r.amount, r.note]),
    ),
    insert(
      "income_oneoffs",
      ["id", "month", "name", "description", "amount", "deleted"],
      i.oneOffs.map((r) => [
        r.id,
        r.month,
        r.name,
        r.description,
        r.amount,
        r.deleted,
      ]),
    ),
    insert(
      "income_audit",
      ["version", "at", "action", "detail"],
      i.audit.map((r) => [r.version, r.at, r.action, r.detail]),
    ),
  ].join("\n\n");
  const seed =
    `${seedPreamble}do $review$\ndeclare\n${declarations}\nreuse_empty_expense boolean;\nbegin\n${lock}\n` +
    (runtime
      ? ""
      : `if not exists (select 1 from auth.users where id=review_owner) then\nraise exception 'User UID does not exist in this project. Sign in first and verify the UID.';\nend if;\n`) +
    `if ${bothMarked} then\nraise notice 'This review dataset is already installed; no changes made.';\nreturn;\nend if;\n` +
    `reuse_empty_expense := (${reusable});\n` +
    `if ${reviewTables.map((t) => `(exists(select 1 from public.${t} where owner_id=review_owner)${reusableTables.includes(t) ? " and not reuse_empty_expense" : ""})`).join(" or\n")} then\nraise exception 'Account already has financial data. Nothing imported. Use an empty review account or review existing data first.';\nend if;\n` +
    `${inserts}\nend;\n$review$;\ncommit;\nselect 'Review data ready. Refresh /overview, /budgets and /income.' as result;\n`;
  const backup =
    `${preamble}set transaction isolation level repeatable read;\n` +
    `do $review$\ndeclare\n${declarations}\nbegin\n` +
    `drop table if exists pg_temp.fm_review_backup;\ncreate temp table fm_review_backup on commit preserve rows as select ${snapshotSQL()} as backup;\nend;\n$review$;\ncommit;\nselect backup from pg_temp.fm_review_backup;\n`;
  // Disable only the named history triggers, under transaction-held table locks.
  // RLS and permissions stay intact; any error rolls back deletes AND trigger DDL.
  const reset =
    `${preamble}-- Only after UI/UX approval: export 02-backup.sql results first.\n` +
    `do $review$\ndeclare\n${declarations}\nconfirmation constant text := 'NOT_CONFIRMED';\n` +
    `begin\nif confirmation <> 'RESET REVIEW ' || review_owner::text then\nraise exception 'Reset not confirmed. Export a backup, then replace NOT_CONFIRMED with RESET REVIEW <owner UID>.';\nend if;\n` +
    `${lock}\nif not (${bothMarked}) then\nraise exception 'Matching review markers missing. Nothing deleted; this reset cannot be used on ordinary financial data.';\nend if;\n` +
    // Acquire write-blocking locks on all tables before snapshot/deletion. Named
    // trigger DDL later upgrades locks while readers retain transaction semantics.
    `lock table ${reviewTables.map((t) => `public.${t}`).join(",")} in share row exclusive mode;\n` +
    `drop table if exists pg_temp.fm_review_reset_backup;\ncreate temp table fm_review_reset_backup on commit preserve rows as select ${snapshotSQL()} as backup;\n` +
    protectedTriggers
      .map(([t, tr]) => `alter table public.${t} disable trigger ${tr};`)
      .join("\n") +
    "\n" +
    deletionOrder
      .map((t) => `delete from public.${t} where owner_id=review_owner;`)
      .join("\n") +
    "\n" +
    protectedTriggers
      .map(([t, tr]) => `alter table public.${t} enable trigger ${tr};`)
      .join("\n") +
    "\n" +
    `if ${reviewTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or\n")} then\nraise exception 'Reset verification failed; transaction rolled back.';\nend if;\n` +
    `end;\n$review$;\ncommit;\nselect backup as backup_before_reset from pg_temp.fm_review_reset_backup;\n`;
  const inspect =
    `${preamble}do $review$\ndeclare\n${declarations}\nbegin\n` +
    `drop table if exists pg_temp.fm_review_inspect;\ncreate temp table fm_review_inspect on commit preserve rows as select review_owner as owner_id,\n` +
    `exists(select 1 from auth.users where id=review_owner) as user_exists,\n(${bothMarked}) as matching_review_dataset,\njsonb_build_object(${countSQL()}) as counts;\nend;\n$review$;\ncommit;\nselect * from pg_temp.fm_review_inspect;\n`;
  return { seed, backup, reset, inspect };
}
