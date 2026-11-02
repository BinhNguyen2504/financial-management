import { buildInvestmentReviewData } from "./investment-review-data.mjs";
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
  `DỮ LIỆU MẪU UI/UX · ${REVIEW_FORMAT} · ${datasetId} · danh mục và ví riêng; lịch sử, phí, thuế và định giá chỉ minh họa.`;
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
  const sample = buildInvestmentReviewData({
    ownerId: base.ownerId,
    today,
    description: investmentReviewDescription(base.datasetId),
  });
  for (const c of sample.book.categories)
    c.rules[0].description = investmentReviewDescription(base.datasetId);
  // Keep generated default-wallet metadata consistent with the domain's atomic create.
  for (const c of sample.book.categories.filter(
    (c) =>
      c.kind === "cash" &&
      !sample.actions.some((a) => a.type === "createCategory" && a.id === c.id),
  ))
    c.rules[0].description = "";
  return {
    ...base,
    investmentToday: today,
    investments: sample.book,
    investmentsSource: {
      images: [],
      syntheticTransactions: true,
      notice:
        "Dữ liệu minh họa theo danh mục và ví riêng; không phải số dư hoặc giao dịch thật.",
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
