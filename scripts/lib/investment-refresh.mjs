import { buildInvestmentReviewSQL } from "./investment-review-data.mjs";
export const refreshTables = [
  "investments_books",
  "investments_categories",
  "investments_transactions",
  "investments_valuations",
  "investments_audit",
  "investments_commands",
];
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
export function snapshotSQL(owner) {
  return `jsonb_build_object(${refreshTables.map((t) => `${q(t)},coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from public.${t} r where owner_id=${q(owner)}::uuid),'[]'::jsonb)`).join(",")})`;
}
/** Admin-only, owner-scoped replacement with exact snapshot and cross-module guards. */
export function buildInvestmentRefreshSQL(sample, snapshot) {
  if (!/^[0-9a-f-]{36}$/i.test(sample.ownerId))
    throw new Error("Invalid owner");
  const owner = q(sample.ownerId),
    order = [...refreshTables].reverse(),
    immutable = refreshTables.filter(
      (t) => !["investments_books", "investments_categories"].includes(t),
    );
  const insert = buildInvestmentReviewSQL(sample)
    .seed.replace(/^begin;\n/, "")
    .replace(/\ncommit;$/, "");
  return `-- Replace ONLY this test owner's Investments; run with the migration/admin connection.\n-- Requires the exported snapshot to still match; other modules are never deleted.\nbegin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nselect pg_advisory_xact_lock(hashtextextended(${owner},0));\nselect pg_advisory_xact_lock(hashtextextended('investments:'||${owner},0));\nselect pg_advisory_xact_lock(hashtextextended('goals:'||${owner},0));\nlock table ${refreshTables.map((t) => `public.${t}`).join(",")} in share row exclusive mode;\ndo $guard$ begin\nif current_user in ('expense_api','authenticated','anon','service_role') then raise exception 'Use the migration/admin connection';end if;\nif ${snapshotSQL(sample.ownerId)} <> ${q(JSON.stringify(snapshot))}::jsonb then raise exception 'INVESTMENT_REFRESH_DATA_CHANGED';end if;\nif exists(select 1 from public.goals_links where owner_id=${owner}::uuid and source_kind='investments') then raise exception 'INVESTMENT_REFRESH_GOAL_LINKS_EXIST';end if;\nend;$guard$;\n${immutable.map((t) => `alter table public.${t} disable trigger investments_history_immutable;`).join("\n")}\n${order.map((t) => `delete from public.${t} where owner_id=${owner}::uuid;`).join("\n")}\n${insert}\n${immutable.map((t) => `alter table public.${t} enable trigger investments_history_immutable;`).join("\n")}\ncommit;\nselect ${snapshotSQL(sample.ownerId)} as investments_after_refresh;\n`;
}
