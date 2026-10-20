import { createHash, randomUUID } from "node:crypto";
import {
  applyAction,
  livingSource,
  replay,
} from "../../src/domain/funds/engine";
import { validateFundBook } from "../../src/domain/funds/validate";
import {
  actionSchema,
  type FundAction,
  type FundId,
  type FundTransaction,
} from "../../src/domain/funds/schema";
import type {
  FundBook,
  FundState,
  LivingSource,
} from "../../src/domain/funds/types";
import { vietnamClock } from "../../src/domain/expenses/engine";
import type { Clock, ExpenseBook } from "../../src/domain/expenses/types";
import { REVIEW_FORMAT, validateUUID } from "./review-data.mjs";
import {
  completeReviewTables,
  investmentReviewDescription,
  type InvestmentReviewData,
} from "./investment-cloud-review.mjs";
export const fundTables = [
  "funds_books",
  "funds_definitions",
  "funds_locations",
  "funds_configurations",
  "funds_transactions",
  "funds_audit",
  "funds_commands",
];
export const fullReviewTables = [...completeReviewTables, ...fundTables];
export const livingJarNames = [
  "Ăn uống & cà phê",
  "Phí sinh hoạt",
  "Mua sắm",
  "Hóa đơn điện",
  "Hóa đơn nước",
];
export const fundReviewDescription = (datasetId: string) =>
  `DỮ LIỆU MẪU UI/UX · ${REVIEW_FORMAT} · ${datasetId} · Fund: số dư và giao dịch chỉ minh họa.`;
function reviewId(datasetId: string) {
  const h = createHash("sha256")
    .update(`fund-review-v1:${datasetId}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export interface FundReviewData {
  format: typeof REVIEW_FORMAT;
  ownerId: string;
  datasetId: string;
  fundReviewId: string;
  fundToday: string;
  generatedAt: string;
  previousMarkers: { savings: string; investments: string };
  source: LivingSource;
  funds: FundBook;
  expected: FundState;
  ids: {
    long: string;
    short: string;
    momo: string;
    cash: string;
    closed: string;
    empty: string;
  };
  references: { images: string[]; notice: string; livingJarNames: string[] };
}
export function buildFundReviewData(
  base: InvestmentReviewData,
  {
    expenses = base.expenses,
    clock = vietnamClock(),
  }: { expenses?: ExpenseBook; clock?: Clock } = {},
): FundReviewData {
  validateUUID(base.ownerId);
  validateUUID(base.datasetId);
  if (
    base.format !== REVIEW_FORMAT ||
    !base.savings?.categories.length ||
    !base.investments?.categories.length
  )
    throw new Error("Cần bộ review bốn module cũ cùng owner/dataset.");
  const source = livingSource(expenses, clock.today.slice(0, 7));
  const jarIds = livingJarNames.map(
    (name) =>
      source.items.find((i) => i.name === name)?.jarId ??
      (() => {
        throw new Error(`Thiếu hũ chi tháng đang hoạt động: ${name}`);
      })(),
  );
  const markerId = reviewId(base.datasetId),
    notice = fundReviewDescription(base.datasetId);
  let book: FundBook | null = null;
  const act = (action: FundAction) => {
    book = applyAction(book, action, source, clock);
  };
  act({
    type: "configure",
    id: markerId,
    jarIds,
    multipliers: { emergency: "6", rainy_day: "7", sinking: "6" },
    priority: ["emergency", "rainy_day", "sinking"],
    applyLiving: true,
    expectedExpenseVersion: source.expenseVersion,
    sourceMonth: source.month,
  });
  const ids = {
    long: randomUUID(),
    short: randomUUID(),
    momo: randomUUID(),
    cash: randomUUID(),
    closed: randomUUID(),
    empty: randomUUID(),
  };
  for (const [key, name] of Object.entries({
    long: "Techcombank · dự phòng dài hạn",
    short: "Techcombank · dự phòng ngắn hạn",
    momo: "Ví thần tài MoMo",
    cash: "Tiền mặt",
    closed: "VIB · đã đối soát",
    empty: "Timo · chờ bổ sung",
  }))
    act({
      type: "saveLocation",
      id: ids[key as keyof typeof ids],
      name,
      active: true,
    });
  const at = (daysAgo: number) =>
    new Date(Date.parse(`${clock.today}T00:00:00Z`) - daysAgo * 86400000)
      .toISOString()
      .slice(0, 10) + "T08:00:00+07:00";
  function tx(
    fundId: FundId,
    locationId: string,
    kind: FundTransaction["kind"],
    amount: string,
    daysAgo: number,
    note: string,
    extra: Record<string, string> = {},
  ) {
    const action = actionSchema.parse({
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        fundId,
        locationId,
        kind,
        amount,
        occurredAt: at(daysAgo),
        note: note === notice ? note : `DỮ LIỆU MẪU UI/UX · ${note}`,
        ...extra,
      },
    });
    act(action);
    return action.type === "postTransaction" ? action.transaction : null;
  }
  tx("emergency", ids.long, "opening", "8000000", 180, notice);
  tx(
    "rainy_day",
    ids.cash,
    "opening",
    "20000000",
    180,
    "Tham khảo phân bổ tiền mặt trong ảnh Fund; số dư mở đầu chỉ minh họa.",
  );
  tx(
    "rainy_day",
    ids.momo,
    "opening",
    "22000000",
    180,
    "Tham khảo phân bổ MoMo 22 triệu trong ảnh; không liên kết số dư Tiết kiệm.",
  );
  tx(
    "sinking",
    ids.short,
    "opening",
    "5000000",
    180,
    "Dự phòng khoản chi đã biết trước.",
  );
  for (const days of [150, 125, 100, 75, 50, 25]) {
    tx(
      "emergency",
      ids.long,
      "deposit",
      "3000000",
      days,
      "Góp định kỳ cho nền tảng an toàn.",
    );
    tx(
      "sinking",
      ids.short,
      "deposit",
      "2000000",
      days,
      "Dành trước cho bảo dưỡng, thay thiết bị thiết yếu.",
    );
  }
  let corrected: FundTransaction | null = null;
  for (let i = 0; i < 10; i++) {
    const t = tx(
      "rainy_day",
      ids.momo,
      "deposit",
      i === 3 ? "450000" : "500000",
      150 - i * 12,
      `Khoản bổ sung dự phòng nhỏ lần ${i + 1}.`,
    );
    if (i === 3) corrected = t;
  }
  tx(
    "rainy_day",
    ids.cash,
    "withdraw",
    "3000000",
    30,
    "Sửa xe bất ngờ; dùng quỹ đúng mục đích.",
  );
  tx(
    "emergency",
    ids.long,
    "withdraw",
    "4000000",
    20,
    "Chi y tế cần thiết trong tình huống giả lập.",
  );
  tx(
    "sinking",
    ids.short,
    "withdraw",
    "3500000",
    18,
    "Thay thiết bị gia dụng đã dự trù.",
  );
  tx(
    "sinking",
    ids.short,
    "transfer",
    "2000000",
    16,
    "Chuyển nơi giữ để đối soát.",
    { toFundId: "sinking", toLocationId: ids.closed },
  );
  tx(
    "sinking",
    ids.closed,
    "transfer",
    "2000000",
    14,
    "Đối soát xong, chuyển về nơi giữ chính.",
    { toFundId: "sinking", toLocationId: ids.short },
  );
  tx(
    "rainy_day",
    ids.momo,
    "deposit",
    "2100000",
    12,
    "Bổ sung sau khi đã sử dụng; giữ phần đệm vượt mục tiêu.",
  );
  tx(
    "emergency",
    ids.long,
    "deposit",
    "3000000",
    10,
    "Từng bước bổ sung quỹ sau lần sử dụng.",
  );
  tx(
    "emergency",
    ids.long,
    "transfer",
    "1000000",
    8,
    "Tách một phần dự phòng tiền mặt dễ tiếp cận.",
    { toFundId: "emergency", toLocationId: ids.cash },
  );
  tx(
    "rainy_day",
    ids.momo,
    "transfer",
    "2000000",
    5,
    "Điều chỉnh ưu tiên: chuyển phần dư sang Emergency.",
    { toFundId: "emergency", toLocationId: ids.long },
  );
  tx(
    "rainy_day",
    ids.cash,
    "transfer",
    "1000000",
    4,
    "Chuyển nội bộ quỹ từ tiền mặt sang MoMo.",
    { toFundId: "rainy_day", toLocationId: ids.momo },
  );
  if (!corrected) throw new Error("Missing correction case");
  act({
    type: "reviseTransaction",
    transactionId: corrected.id,
    replacement: { ...corrected, amount: "500000" },
    reason: "DỮ LIỆU MẪU UI/UX · đối soát khoản góp từ 450.000 thành 500.000.",
  });
  const duplicate = tx(
    "rainy_day",
    ids.momo,
    "deposit",
    "2000000",
    3,
    "Khoản ghi trùng để review chức năng hủy.",
  )!;
  act({
    type: "reviseTransaction",
    transactionId: duplicate.id,
    replacement: null,
    reason: "DỮ LIỆU MẪU UI/UX · hủy khoản bị ghi trùng, giữ bản gốc.",
  });
  act({
    type: "saveLocation",
    id: ids.closed,
    name: "VIB · đã đối soát",
    active: false,
  });
  act({
    type: "configure",
    id: randomUUID(),
    jarIds,
    multipliers: { emergency: "9", rainy_day: "7", sinking: "9" },
    priority: ["rainy_day", "emergency", "sinking"],
    applyLiving: false,
    expectedExpenseVersion: source.expenseVersion,
    sourceMonth: source.month,
  });
  const result = book as unknown as FundBook;
  validateFundBook(result);
  return {
    format: REVIEW_FORMAT,
    ownerId: base.ownerId,
    datasetId: base.datasetId,
    fundReviewId: markerId,
    fundToday: clock.today,
    generatedAt: clock.now,
    previousMarkers: {
      savings: base.savings.categories[0].rules[0].description,
      investments: investmentReviewDescription(base.datasetId),
    },
    source,
    funds: result,
    expected: replay(result),
    ids,
    references: {
      images: ["Notion/fund-1.png", "Notion/fund-2.png", "Notion/goal.png"],
      livingJarNames,
      notice:
        "Mục tiêu 54/54/42 triệu tham khảo ảnh. Nguồn sống lấy 5 hũ hiện có, không sửa Chi tiêu hoặc ép bằng 9 triệu trong ảnh. Nếu nguồn là 6 triệu, hệ số mẫu là 9/9/7. Mọi số dư, ngày và giao dịch đều là minh họa.",
    },
  };
}
export const sqlLiteral = (v: unknown): string =>
  v === null
    ? "null"
    : typeof v === "number"
      ? String(v)
      : `'${(typeof v === "string" ? v : JSON.stringify(v)).replaceAll("'", "''")}'`;
export function reviewMarkerSQL(data: FundReviewData) {
  const q = sqlLiteral;
  const old = (module: string) =>
    `exists(select 1 from public.${module}_audit where owner_id=review_owner and action='seedReviewData' and detail->>'format'=${q(REVIEW_FORMAT)} and detail->>'datasetId'=review_dataset)`;
  const previous = `${old("expense")} and ${old("income")} and exists(select 1 from public.savings_audit where owner_id=review_owner and action->>'type'='createCategory' and action->>'description'=${q(data.previousMarkers.savings)}) and exists(select 1 from public.investments_audit where owner_id=review_owner and action->>'type'='createCategory' and action->>'description'=${q(data.previousMarkers.investments)})`;
  const funds = `exists(select 1 from public.funds_audit where owner_id=review_owner and action->>'type'='configure' and action->>'id'=${q(data.fundReviewId)}) and exists(select 1 from public.funds_audit where owner_id=review_owner and action->>'type'='postTransaction' and action->'transaction'->>'note'=${q(fundReviewDescription(data.datasetId))})`;
  return { previous, funds, all: `(${previous}) and (${funds})` };
}
export function buildFundReviewSQL(
  data: FundReviewData,
  {
    runtime = false,
    migrationSQL = "",
  }: { runtime?: boolean; migrationSQL?: string } = {},
) {
  validateUUID(data.ownerId);
  validateUUID(data.datasetId);
  validateUUID(data.fundReviewId);
  validateFundBook(data.funds);
  if (
    data.format !== REVIEW_FORMAT ||
    data.funds.configurations[0].id !== data.fundReviewId
  )
    throw new Error("Sai bộ dữ liệu Fund.");
  const q = sqlLiteral,
    b = data.funds,
    marker = reviewMarkerSQL(data);
  const prefix =
    "begin;\nset local lock_timeout='5s';\nset local statement_timeout='90s';\nset local standard_conforming_strings=on;\n";
  const declarations = `review_owner constant uuid := ${q(data.ownerId)}::uuid;\nreview_dataset constant text := ${q(data.datasetId)};`;
  const locks = ["", "income:", "savings:", "investments:", "funds:"]
    .map(
      (p) =>
        `perform pg_advisory_xact_lock(hashtextextended(${p ? `${q(p)}||` : ""}review_owner::text,0));`,
    )
    .join("\n");
  const insert = (table: string, columns: string[], values: unknown[]) =>
    `insert into public.${table}(owner_id,${columns.join(",")}) values(review_owner,${values.map(q).join(",")});`;
  const inserts = [
    insert("funds_books", ["version"], [b.version]),
    ...b.funds.map((id) => insert("funds_definitions", ["id"], [id])),
    ...b.locations.map((l) =>
      insert("funds_locations", ["id", "data"], [l.id, l]),
    ),
    ...b.configurations.map((c) =>
      insert(
        "funds_configurations",
        ["id", "sequence", "data"],
        [c.id, c.sequence, c],
      ),
    ),
  ];
  for (const r of b.revisions) {
    const first = b.revisions.find((x) => x.rootId === r.rootId)!,
      t = r.transaction ?? first.transaction!;
    inserts.push(
      insert(
        "funds_transactions",
        [
          "id",
          "root_id",
          "sequence",
          "fund_id",
          "location_id",
          "to_fund_id",
          "to_location_id",
          "data",
        ],
        [
          r.id,
          first.id,
          r.sequence,
          t.fundId,
          t.locationId,
          t.kind === "transfer" ? t.toFundId : null,
          t.kind === "transfer" ? t.toLocationId : null,
          r,
        ],
      ),
    );
  }
  inserts.push(
    ...b.audit.map((a) =>
      insert(
        "funds_audit",
        ["version", "at", "action"],
        [a.version, a.at, a.action],
      ),
    ),
  );
  const accepted = b.configurations[0].living,
    jarArray = `array[${accepted.items.map((i) => q(i.jarId) + "::uuid").join(",")}]`;
  const sourceGuard = `if (select version from public.expense_books where owner_id=review_owner) is distinct from ${accepted.expenseVersion} then raise exception 'Expense source version changed; regenerate the Fund review package.';end if;
if to_char(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM') <> ${q(accepted.month)} then raise exception 'Expense source month changed; regenerate the Fund review package.';end if;
if (select jsonb_agg(jsonb_build_array(j.id,r.rule->>'name',r.rule->>'amount') order by j.id) from public.expense_jars j cross join lateral (select rule from jsonb_array_elements(j.rules) rule where rule->>'month'<=${q(accepted.month)} order by rule->>'month' desc limit 1) r where j.owner_id=review_owner and j.id=any(${jarArray}) and j.kind='monthly' and j.start_month<=${q(accepted.month)} and (r.rule->>'active')::boolean) is distinct from ${q(accepted.items.map((i) => [i.jarId, i.name, i.amount]))}::jsonb then raise exception 'Living expense source changed; nothing imported.';end if;`;
  const body = `do $fund_review$ declare ${declarations}\nbegin\n${locks}\nif not (${marker.previous}) then raise exception 'Matching previous review markers required; nothing imported.';end if;\nif ${marker.funds} then raise notice 'Fund review already installed; preserving review edits.';return;end if;\nif ${fundTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or ")} then raise exception 'Fund already contains unrelated data; nothing imported.';end if;\n${sourceGuard}\n${inserts.join("\n")}\nend;$fund_review$;\n`;
  const role = runtime
    ? `do $role$ begin if session_user<>'expense_api' then raise exception 'Expected expense_api runtime connection';end if;end;$role$;\nset local role authenticated;\nselect set_config('request.jwt.claims',${q({ sub: data.ownerId, role: "authenticated" })},true);\n`
    : "";
  const seed = prefix + role + body + "commit;\n";
  const allAbsent = fundTables
      .map((t) => `to_regclass('public.${t}') is null`)
      .join(" and "),
    someAbsent = fundTables
      .map((t) => `to_regclass('public.${t}') is null`)
      .join(" or ");
  const enable = migrationSQL
    ? prefix +
      `do $enable_funds$ declare ${declarations} begin if not (${marker.previous}) then raise exception 'Matching previous review markers required before migration';end if;if not exists(select 1 from auth.users where id=review_owner) then raise exception 'Target auth owner does not exist';end if;if ${allAbsent} then execute ${q(migrationSQL)};elsif ${someAbsent} then raise exception 'Partial Fund schema; inspect migration state before importing.';end if;end;$enable_funds$;\n` +
      body +
      "commit;\n"
    : null;
  // SQL exports preserve every database column. They are operational snapshots, not app restore files.
  const snapshot = `jsonb_build_object('format','financial-manager-owner-review-backup-v4','ownerId',review_owner,'datasetId',review_dataset,'exportedAt',clock_timestamp(),'tables',jsonb_build_object(${fullReviewTables.map((t) => `${q(t)},coalesce((select jsonb_agg(to_jsonb(r)) from public.${t} r where owner_id=review_owner),'[]'::jsonb)`).join(",")}))`;
  const receiptSnapshot = `if to_regclass('public.data_imports') is not null then execute 'select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.data_imports r where owner_id=$1' into receipts using review_owner;else receipts:='[]'::jsonb;end if;`;
  const backup =
    prefix +
    `set transaction isolation level repeatable read;\ndo $backup$ declare ${declarations}\nreceipts jsonb;begin\n${receiptSnapshot}\ndrop table if exists pg_temp.fm_fund_review_backup;create temp table fm_fund_review_backup on commit preserve rows as select ${snapshot} || jsonb_build_object('dataImports',receipts) as backup;end;$backup$;commit;select backup from pg_temp.fm_fund_review_backup;\n`;
  const triggers: [string, string][] = [
    ["expense_years", "expense_year_sealed"],
    ["expense_audit", "expense_audit_immutable"],
    ["expense_commands", "expense_commands_immutable"],
    ["income_audit", "income_audit_immutable"],
    ["income_commands", "income_commands_immutable"],
    ...completeReviewTables
      .filter(
        (t) =>
          t.startsWith("savings_") &&
          !["savings_books", "savings_categories"].includes(t),
      )
      .map((t) => [t, "savings_history_immutable"] as [string, string]),
    ...completeReviewTables
      .filter(
        (t) =>
          t.startsWith("investments_") &&
          !["investments_books", "investments_categories"].includes(t),
      )
      .map((t) => [t, "investments_history_immutable"] as [string, string]),
    ...fundTables
      .filter((t) => !["funds_books", "funds_locations"].includes(t))
      .map((t) => [t, "funds_history_immutable"] as [string, string]),
  ];
  const order = [
    "funds_commands",
    "funds_audit",
    "funds_transactions",
    "funds_configurations",
    "funds_locations",
    "funds_definitions",
    "funds_books",
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
    `-- DESTRUCTIVE: run only after separate UI/UX approval, exact-owner confirmation and backup export.\ndo $reset$ declare ${declarations}\nconfirmation constant text := 'NOT_CONFIRMED';\nreceipts jsonb;begin\nif confirmation <> 'RESET REVIEW '||review_owner::text then raise exception 'Reset not confirmed. Export backup and confirm UI/UX approval for this owner first.';end if;\n${locks}\nif not (${marker.all}) then raise exception 'Matching markers in all five modules required; nothing deleted.';end if;\nlock table ${fullReviewTables.map((t) => `public.${t}`).join(",")} in share row exclusive mode;\nif to_regclass('public.data_imports') is not null then execute 'lock table public.data_imports in share row exclusive mode';end if;\n${receiptSnapshot}\ndrop table if exists pg_temp.fm_fund_reset_backup;create temp table fm_fund_reset_backup on commit preserve rows as select ${snapshot} || jsonb_build_object('dataImports',receipts) as backup;\n${triggers.map(([t, tr]) => `alter table public.${t} disable trigger ${tr};`).join("\n")}\nif to_regclass('public.data_imports') is not null then execute 'alter table public.data_imports disable trigger data_imports_immutable';execute 'delete from public.data_imports where owner_id=$1' using review_owner;execute 'alter table public.data_imports enable trigger data_imports_immutable';end if;\n${order.map((t) => `delete from public.${t} where owner_id=review_owner;`).join("\n")}\n${triggers.map(([t, tr]) => `alter table public.${t} enable trigger ${tr};`).join("\n")}\nif ${fullReviewTables.map((t) => `exists(select 1 from public.${t} where owner_id=review_owner)`).join(" or ")} then raise exception 'Reset verification failed';end if;end;$reset$;commit;select backup as backup_before_reset from pg_temp.fm_fund_reset_backup;\n`;
  const inspect =
    prefix +
    `do $inspect$ declare ${declarations}\nt text;n bigint;counts jsonb:='{}'::jsonb;missing jsonb:='[]'::jsonb;previous_marker boolean:=false;fund_marker boolean:=false;begin\nforeach t in array array[${fullReviewTables.map(q).join(",")}] loop if to_regclass('public.'||t) is null then missing:=missing||to_jsonb(t);else execute format('select count(*) from public.%I where owner_id=$1',t) into n using review_owner;counts:=counts||jsonb_build_object(t,n);end if;end loop;\nif ${completeReviewTables.map((t) => `to_regclass('public.${t}') is not null`).join(" and ")} then previous_marker:=(${marker.previous});end if;\nif not (${someAbsent}) then fund_marker:=(${marker.funds});end if;\ndrop table if exists pg_temp.fm_fund_inspect;create temp table fm_fund_inspect on commit preserve rows as select review_owner as owner_id,session_user as connection_role,has_schema_privilege(session_user,'public','CREATE') as can_create,previous_marker as previous_markers_match,fund_marker as fund_marker_match,missing as missing_tables,counts as counts;end;$inspect$;commit;select * from pg_temp.fm_fund_inspect;\n`;
  return { seed, enable, backup, reset, inspect };
}
