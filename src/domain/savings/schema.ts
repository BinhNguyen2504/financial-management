import { z } from "zod";
import { moneySchema, monthSchema } from "../income/schema";
export { moneySchema, monthSchema };
export const dateSchema = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  }, "Ngày không hợp lệ.");
const id = z.uuid();
const text = z.string().trim().max(1000);
const name = z.string().trim().min(1).max(100);
const positive = moneySchema.refine(
  (v) => BigInt(v) > 0n,
  "Số tiền phải lớn hơn 0.",
);
export const quantitySchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,17})(\.\d{1,6})?$/)
  .refine((v) => BigInt(v.replace(".", "")) > 0n, "Số lượng phải lớn hơn 0.");
export const kindSchema = z.enum(["cash", "deposit", "gold"]);
const base = { id, date: dateSchema, categoryId: id, note: text.default("") };
const cash = { cashCategoryId: id.nullable().default(null) };
const charges = {
  fee: moneySchema.default("0"),
  tax: moneySchema.default("0"),
};
const contract = {
  name,
  maturity: dateSchema,
  term: z.string().trim().max(100).default(""),
};
export const transactionSchema = z.discriminatedUnion("kind", [
  z
    .object({ ...base, kind: z.literal("openingCash"), amount: positive })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("openingDeposit"),
      amount: positive,
      ...contract,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("openingGold"),
      amount: positive,
      quantity: quantitySchema,
      unitPrice: positive,
    })
    .strict(),
  z.object({ ...base, kind: z.literal("deposit"), amount: positive }).strict(),
  z
    .object({
      ...base,
      kind: z.literal("withdraw"),
      amount: positive,
      ...charges,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("transfer"),
      amount: positive,
      cashCategoryId: id,
      ...charges,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("openDeposit"),
      amount: positive,
      ...contract,
      ...cash,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("withdrawDeposit"),
      contractId: id,
      amount: positive,
      interest: moneySchema.default("0"),
      ...charges,
      ...cash,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("interest"),
      contractId: id,
      amount: positive,
      capitalize: z.boolean(),
      ...cash,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("rollover"),
      contractId: id,
      interest: moneySchema,
      reinvestInterest: moneySchema,
      ...contract,
      ...charges,
      ...cash,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("buyGold"),
      quantity: quantitySchema,
      unitPrice: positive,
      ...charges,
      ...cash,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("sellGold"),
      allocations: z
        .array(z.object({ lotId: id, quantity: quantitySchema }).strict())
        .min(1)
        .max(100),
      unitPrice: positive,
      ...charges,
      ...cash,
    })
    .strict(),
  z.object({ ...base, kind: z.literal("fee"), amount: positive }).strict(),
]);
export type SavingsTransaction = z.infer<typeof transactionSchema>;
const metadata = {
  name,
  description: text.default(""),
  emoji: z.string().trim().max(32).default("🌱"),
};
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("createCategory"),
      id,
      start: monthSchema,
      kind: kindSchema,
      unit: z.enum(["chỉ", "lượng/cây", "gram"]).nullable().default(null),
      ...metadata,
    })
    .strict(),
  z
    .object({
      type: z.literal("configureCategory"),
      categoryId: id,
      month: monthSchema,
      ...metadata,
    })
    .strict(),
  z
    .object({
      type: z.literal("archiveCategory"),
      categoryId: id,
      month: monthSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("restoreCategory"),
      categoryId: id,
      month: monthSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("postTransaction"),
      transaction: transactionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("reviseTransaction"),
      transactionId: id,
      replacement: transactionSchema.nullable(),
      reason: text.min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("setPrice"),
      id,
      categoryId: id,
      date: dateSchema,
      price: positive,
    })
    .strict(),
  z
    .object({
      type: z.literal("closeMonth"),
      month: monthSchema,
      acceptStalePrices: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      type: z.literal("reopenMonth"),
      month: monthSchema,
      reason: text.min(1),
    })
    .strict(),
]);
export type SavingsAction = z.infer<typeof actionSchema>;
export const commandSchema = z
  .object({
    id,
    expectedVersion: z.number().int().min(0),
    action: actionSchema,
  })
  .strict();
export type SavingsCommand = z.infer<typeof commandSchema>;
