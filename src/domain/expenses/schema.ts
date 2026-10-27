import { expenseDateSchema as dateSchema } from "../shared/schema";
import { expenseMonthSchema as monthSchema } from "../shared/schema";
import { expenseMoneySchema as moneySchema } from "../shared/schema";
import { z } from "zod";
import { brandKeys, labelIconKeys } from "./label-visuals";
import { EMOJI_VALUES } from "./emoji";

const id = z.uuid();
const name = z.string().trim().min(1, "Cần nhập tên.").max(100);
const config = {
  name,
  description: z.string().trim().max(1000),
  method: name,
  group: z.string().trim().max(100),
  amount: moneySchema,
};
export const expenseActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("setJarEmoji"),
      jarId: id,
      month: monthSchema,
      emoji: z.enum(EMOJI_VALUES).nullable(),
    })
    .strict(),
  z.object({ type: z.literal("initialize"), start: monthSchema }).strict(),
  z
    .object({
      type: z.literal("createJar"),
      id,
      kind: z.enum(["monthly", "accumulation"]),
      start: monthSchema,
      opening: moneySchema,
      emoji: z.enum(EMOJI_VALUES).nullable().optional(),
      ...config,
    })
    .strict(),
  z
    .object({
      type: z.literal("configureJar"),
      jarId: id,
      month: monthSchema,
      ...config,
    })
    .strict(),
  z
    .object({ type: z.literal("stopJar"), jarId: id, month: monthSchema })
    .strict(),
  z
    .object({
      type: z.literal("editMonth"),
      jarId: id,
      month: monthSchema,
      target: moneySchema.nullable(),
      funding: moneySchema.nullable(),
      extra: moneySchema,
      closing: moneySchema.nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("upsertSpend"),
      id,
      jarId: id,
      date: dateSchema,
      amount: moneySchema.refine(
        (v) => BigInt(v) > 0n,
        "Số tiền phải lớn hơn 0.",
      ),
      note: z.string().trim().max(1000),
    })
    .strict(),
  z.object({ type: z.literal("deleteSpend"), id }).strict(),
  z
    .object({
      type: z.literal("upsertLabel"),
      id,
      kind: z.enum(["method", "group"]),
      name,
      brandKey: z.enum(brandKeys).nullable().optional(),
      iconKey: z.enum(labelIconKeys).nullable().optional(),
    })
    .strict(),
  z.object({ type: z.literal("deleteLabel"), id }).strict(),
  z
    .object({
      type: z.literal("closeYear"),
      year: z.number().int().min(2000).max(2099),
    })
    .strict(),
]);
export type ExpenseAction = z.infer<typeof expenseActionSchema>;
export const commandSchema = z
  .object({
    id: z.uuid(),
    expectedVersion: z.number().int().min(0),
    action: expenseActionSchema,
  })
  .strict();
export type ExpenseCommand = z.infer<typeof commandSchema>;

export { moneySchema };

export { monthSchema };

export { dateSchema };
