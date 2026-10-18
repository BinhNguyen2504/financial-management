import { z } from "zod";
import {
  moneySchema as money,
  monthSchema as month,
  dateSchema as date,
} from "../expenses/schema";
import { EMOJI_VALUES } from "../expenses/emoji";
import {
  transactionSchema as savingsTransaction,
  actionSchema as savingsAction,
} from "../savings/schema";
import {
  transactionSchema as investmentTransaction,
  actionSchema as investmentAction,
} from "../investments/schema";
import { profileSchema } from "../profile";

const uuid = z.uuid(),
  text = z.string().max(1000),
  name = z.string().min(1).max(100);
const integer = z.number().int().min(1).max(2147483647);
const timestamp = z.iso.datetime({ offset: true });
const signed = z
  .string()
  .max(100)
  .regex(/^-?(0|[1-9]\d*)$/);
const decimal = z
  .string()
  .max(100)
  .regex(/^-?(0|[1-9]\d*)(\.\d{1,6})?$/);
const metadata = {
  name,
  description: text,
  emoji: z.string().max(32),
  active: z.boolean(),
};
const expenseRule = z.strictObject({
  ...metadata,
  emoji: z.enum(EMOJI_VALUES).nullable().optional(),
  month,
  method: name,
  group: z.string().max(100),
  amount: money,
});
const expenseRow = z.strictObject({
  emoji: z.enum(EMOJI_VALUES).nullable().optional(),
  jarId: uuid,
  month,
  kind: z.enum(["monthly", "accumulation"]),
  name,
  description: text,
  method: name,
  group: z.string().max(100),
  active: z.boolean(),
  target: signed,
  opening: signed,
  required: signed,
  funding: signed,
  extra: signed,
  available: signed,
  spent: signed,
  closing: signed,
  over: signed,
  status: z.enum(["actual", "provisional", "planned"]),
});
const savingsCategory = z.strictObject({
  id: uuid,
  start: month,
  kind: z.enum(["cash", "deposit", "gold"]),
  unit: z.enum(["chỉ", "lượng/cây", "gram"]).nullable(),
  rules: z.array(z.strictObject({ ...metadata, month })).min(1),
});
const investmentCategory = z.strictObject({
  id: uuid,
  start: date,
  kind: z.enum(["cash", "investment"]),
  rules: z
    .array(z.strictObject({ ...metadata, date, sequence: integer }))
    .min(1),
});
const revision = {
  id: z.string().min(1).max(100),
  rootId: uuid,
  sequence: integer,
  reason: text,
};
const savingsRevision = z.strictObject({
  ...revision,
  transaction: savingsTransaction.nullable(),
});
const investmentRevision = z.strictObject({
  ...revision,
  at: timestamp,
  transaction: investmentTransaction.nullable(),
});
const savingsState = z.strictObject({
  asOf: date,
  positions: z.array(
    z.strictObject({
      id: uuid,
      ...metadata,
      kind: z.enum(["cash", "deposit", "gold"]),
      unit: z.string().nullable(),
      cash: signed,
      quantity: decimal,
      cost: signed,
      value: signed.nullable(),
      price: signed.nullable(),
      priceDate: date.nullable(),
      stale: z.boolean(),
      unrealized: signed.nullable(),
    }),
  ),
  contracts: z.array(
    z.strictObject({
      id: uuid,
      categoryId: uuid,
      name,
      opened: date,
      maturity: date,
      term: text,
      principal: signed,
      previousId: uuid.nullable(),
    }),
  ),
  lots: z.array(
    z.strictObject({
      id: uuid,
      categoryId: uuid,
      date,
      quantity: decimal,
      cost: signed,
    }),
  ),
  effects: z.array(
    z.strictObject({
      id: uuid,
      date,
      kind: z.enum([
        "deposit",
        "openingCash",
        "openingDeposit",
        "openingGold",
        "withdraw",
        "transfer",
        "openDeposit",
        "withdrawDeposit",
        "interest",
        "rollover",
        "buyGold",
        "sellGold",
        "fee",
      ]),
      categoryId: uuid,
      cashCategoryId: uuid.nullable(),
      external: signed,
      internal: z.record(z.string(), signed),
      opening: z.record(z.string(), signed),
      interest: signed,
      realized: signed,
      fees: signed,
      net: signed,
      costSold: signed,
      quantity: decimal,
      note: text,
    }),
  ),
  knownValue: signed,
  total: signed.nullable(),
  missing: z.array(z.string()),
});
const balance = z.strictObject({
  cash: signed,
  cost: signed,
  value: signed.nullable(),
});
const investmentState = z.strictObject({
  asOf: date,
  positions: z.array(
    z.strictObject({
      id: uuid,
      ...metadata,
      kind: z.enum(["investment", "cash"]),
      cash: signed,
      cost: signed,
      value: signed.nullable(),
      valueDate: date.nullable(),
      stale: z.boolean(),
      unrealized: signed.nullable(),
      realized: signed,
      roi: decimal.nullable(),
    }),
  ),
  effects: z.array(
    z.strictObject({
      id: uuid,
      date,
      kind: z.enum([
        "openingCash",
        "openingInvestment",
        "deposit",
        "withdraw",
        "transfer",
        "buy",
        "sell",
        "valuation",
      ]),
      categoryId: uuid,
      cashCategoryId: uuid.nullable(),
      external: signed,
      internal: z.record(z.string(), signed),
      opening: z.record(z.string(), signed),
      net: signed,
      fees: signed,
      tax: signed,
      costSold: signed,
      realized: signed,
      note: text,
      counterparty: z.string().max(200),
      before: z.record(z.string(), balance),
      after: z.record(z.string(), balance),
    }),
  ),
  knownValue: signed,
  total: signed.nullable(),
  missing: z.array(z.string()),
});
const commandFields = {
  id: uuid,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
};
const expenseChangeBalance = z
  .strictObject({ funding: signed, closing: signed, spent: signed })
  .nullable();
const expenseCommand = z.strictObject({
  ...commandFields,
  result: z.strictObject({
    version: integer,
    changes: z.array(
      z.strictObject({
        jarId: uuid,
        name,
        month,
        before: expenseChangeBalance,
        after: expenseChangeBalance,
      }),
    ),
  }),
});
const incomeCommand = z.strictObject({
  ...commandFields,
  result: z.strictObject({
    version: integer,
    effectiveFrom: month.nullable(),
    changes: z.array(
      z.strictObject({
        kind: z.enum(["fixed", "oneoff"]),
        month,
        key: uuid,
        before: money.nullable(),
        after: money.nullable(),
        beforeName: name.nullable(),
        afterName: name.nullable(),
        beforeActive: z.boolean().nullable(),
        afterActive: z.boolean().nullable(),
      }),
    ),
  }),
});
const savingsCommand = z.strictObject({
  ...commandFields,
  result: z.strictObject({
    version: integer,
    before: savingsState,
    after: savingsState,
  }),
});
const investmentCommand = z.strictObject({
  ...commandFields,
  result: z.strictObject({
    version: integer,
    before: investmentState,
    after: investmentState,
  }),
});
const audit = {
  version: integer,
  at: timestamp,
  action: z.string().max(100),
  detail: z.json(),
};
const transactionColumns = {
  id: revision.id,
  root_id: uuid,
  sequence: integer,
  category_id: uuid,
  cash_category_id: uuid.nullable(),
};

// Fixed allowlist. These shapes also define every selected/inserted column.
export const tableSchemas = {
  expense_books: z.strictObject({ start_month: month, version: integer }),
  expense_jars: z.strictObject({
    id: uuid,
    kind: z.enum(["monthly", "accumulation"]),
    start_month: month,
    opening: money,
    rules: z.array(expenseRule).min(1),
  }),
  expense_month_inputs: z.strictObject({
    jar_id: uuid,
    month,
    target: money.nullable(),
    funding: money.nullable(),
    extra: money,
    closing: money.nullable(),
  }),
  expense_spends: z.strictObject({
    id: uuid,
    jar_id: uuid,
    date,
    amount: money.refine((v) => BigInt(v) > 0n),
    note: text,
    deleted: z.boolean(),
  }),
  expense_years: z
    .strictObject({
      year: z.number().int().min(2000).max(2099),
      closed_at: timestamp.nullable(),
      snapshot: z.array(expenseRow).nullable(),
    })
    .refine((r) => (r.closed_at === null) === (r.snapshot === null)),
  expense_labels: z.strictObject({
    id: uuid,
    kind: z.enum(["method", "group"]),
    name,
  }),
  expense_audit: z.strictObject(audit),
  expense_commands: expenseCommand,
  income_books: z.strictObject({ version: integer }),
  income_categories: z.strictObject({
    id: uuid,
    start_month: month,
    deleted: z.boolean(),
    rules: z
      .array(
        z.strictObject({ month, name, description: text, active: z.boolean() }),
      )
      .min(1),
  }),
  income_monthly: z.strictObject({
    category_id: uuid,
    month,
    amount: money,
    note: text,
  }),
  income_oneoffs: z.strictObject({
    id: uuid,
    month,
    name,
    description: text,
    amount: money.refine((v) => BigInt(v) > 0n),
    deleted: z.boolean(),
  }),
  income_audit: z.strictObject(audit),
  income_commands: incomeCommand,
  savings_books: z.strictObject({ version: integer }),
  savings_categories: z.strictObject({ id: uuid, data: savingsCategory }),
  savings_transactions: z.strictObject({
    ...transactionColumns,
    contract_id: uuid.nullable(),
    data: savingsRevision,
  }),
  savings_allocations: z.strictObject({
    revision_id: revision.id,
    lot_id: uuid,
  }),
  savings_prices: z.strictObject({
    id: uuid,
    category_id: uuid,
    sequence: integer,
    data: z.strictObject({
      id: uuid,
      categoryId: uuid,
      date,
      price: money.refine((v) => BigInt(v) > 0n),
      sequence: integer,
    }),
  }),
  savings_closes: z.strictObject({
    id: revision.id,
    sequence: integer,
    data: z.strictObject({
      id: revision.id,
      sequence: integer,
      month,
      kind: z.enum(["close", "reopen"]),
      reason: text,
      snapshot: savingsState.nullable(),
    }),
  }),
  savings_audit: z.strictObject({
    version: integer,
    at: timestamp,
    action: savingsAction,
  }),
  savings_commands: savingsCommand,
  investments_books: z.strictObject({ version: integer }),
  investments_categories: z.strictObject({
    id: uuid,
    data: investmentCategory,
  }),
  investments_transactions: z.strictObject({
    ...transactionColumns,
    data: investmentRevision,
  }),
  investments_valuations: z.strictObject({
    ...transactionColumns,
    data: investmentRevision,
  }),
  investments_audit: z.strictObject({
    version: integer,
    at: timestamp,
    action: investmentAction,
  }),
  investments_commands: investmentCommand,
} as const;
export type BackupTable = keyof typeof tableSchemas;
export const backupTables = Object.keys(tableSchemas) as BackupTable[];
const tablesShape = Object.fromEntries(
  backupTables.map((t) => [t, z.array(tableSchemas[t])]),
);
const wireSchema = z.strictObject({
  format: z.literal("financial-manager-full-backup"),
  schemaVersion: z.literal(1),
  exportedAt: timestamp,
  profile: profileSchema.extend({ full_name: z.string().max(100) }).strict(),
  tables: z.strictObject(tablesShape),
});
export type BackupTables = {
  [K in BackupTable]: z.infer<(typeof tableSchemas)[K]>[];
};
export interface FullBackupV1 {
  format: "financial-manager-full-backup";
  schemaVersion: 1;
  exportedAt: string;
  profile: z.infer<typeof wireSchema>["profile"];
  tables: BackupTables;
}
export class BackupError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_BACKUP",
  ) {
    super(message);
  }
}
export function parseBackup(value: unknown): FullBackupV1 {
  const parsed = wireSchema.safeParse(value);
  if (!parsed.success)
    throw new BackupError(
      "File không phải bản sao lưu toàn tài khoản phiên bản 1 hợp lệ. Hãy chọn file JSON được xuất từ Cài đặt.",
    );
  return parsed.data as unknown as FullBackupV1;
}
export function primaryColumns(table: BackupTable): string[] {
  if (table.endsWith("_books")) return [];
  if (table === "expense_month_inputs") return ["jar_id", "month"];
  if (table === "income_monthly") return ["category_id", "month"];
  if (table === "expense_years") return ["year"];
  if (table.endsWith("_audit")) return ["version"];
  if (table === "savings_allocations") return ["revision_id", "lot_id"];
  return ["id"];
}
export const moduleLabels = {
  expense: "Chi tiêu",
  income: "Thu nhập",
  savings: "Tiết kiệm",
  investments: "Đầu tư",
};
export function summarizeBackup(backup: FullBackupV1) {
  const counts = Object.fromEntries(
    Object.entries(moduleLabels).map(([prefix, label]) => [
      prefix,
      {
        label,
        rows: backupTables
          .filter((t) => t.startsWith(prefix + "_"))
          .reduce((n, t) => n + backup.tables[t].length, 0),
      },
    ]),
  );
  const dates: string[] = [];
  const visit = (v: unknown, key = "") => {
    if (
      typeof v === "string" &&
      ["date", "month", "start", "start_month"].includes(key) &&
      /^20\d{2}-\d{2}(-\d{2})?$/.test(v)
    )
      dates.push(v);
    else if (Array.isArray(v)) v.forEach((x) => visit(x));
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => visit(x, k));
  };
  visit(backup.tables);
  dates.sort();
  return {
    exportedAt: backup.exportedAt,
    counts,
    from: dates[0] ?? null,
    to: dates.at(-1) ?? null,
  };
}
