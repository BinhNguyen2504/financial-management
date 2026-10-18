import { z } from "zod";
import { moneySchema, monthSchema, dateSchema } from "../savings/schema";
export { moneySchema, monthSchema, dateSchema };
const id = z.uuid();
const text = z.string().trim().max(1000);
const name = z.string().trim().min(1).max(100);
const positive = moneySchema.refine(
  (v) => BigInt(v) > 0n,
  "Số tiền phải lớn hơn 0.",
);
export const kindSchema = z.enum(["investment", "cash"]);
const base = {
  id,
  date: dateSchema,
  categoryId: id,
  note: text.default(""),
  counterparty: z.string().trim().max(200).default(""),
};
const cash = { cashCategoryId: id.nullable().default(null) };
const charges = {
  fee: moneySchema.default("0"),
  tax: moneySchema.default("0"),
};
export const transactionSchema = z.discriminatedUnion("kind", [
  z
    .object({ ...base, kind: z.literal("openingCash"), amount: moneySchema })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("openingInvestment"),
      cost: moneySchema,
      value: moneySchema,
    })
    .strict(),
  z.object({ ...base, kind: z.literal("deposit"), amount: positive }).strict(),
  z.object({ ...base, kind: z.literal("withdraw"), amount: positive }).strict(),
  z
    .object({
      ...base,
      kind: z.literal("transfer"),
      amount: positive,
      cashCategoryId: id,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("buy"),
      amount: positive,
      ...charges,
      ...cash,
      value: moneySchema,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("sell"),
      amount: moneySchema,
      cost: moneySchema,
      ...charges,
      ...cash,
      value: moneySchema,
    })
    .strict(),
  z
    .object({ ...base, kind: z.literal("valuation"), value: moneySchema })
    .strict(),
]);
export type InvestmentTransaction = z.infer<typeof transactionSchema>;
const metadata = {
  name,
  description: text.default(""),
  emoji: z.string().trim().min(1).max(32).default("🌱"),
};
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("createCategory"),
      id,
      start: dateSchema,
      kind: kindSchema,
      ...metadata,
    })
    .strict(),
  z
    .object({
      type: z.literal("configureCategory"),
      categoryId: id,
      date: dateSchema,
      kind: kindSchema,
      ...metadata,
    })
    .strict(),
  z
    .object({
      type: z.literal("archiveCategory"),
      categoryId: id,
      date: dateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("restoreCategory"),
      categoryId: id,
      date: dateSchema,
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
]);
export type InvestmentAction = z.infer<typeof actionSchema>;
export const commandSchema = z
  .object({
    id,
    expectedVersion: z.number().int().min(0),
    action: actionSchema,
  })
  .strict();
export type InvestmentCommand = z.infer<typeof commandSchema>;
