import { z } from "zod";
import { brandKeys, labelIconKeys } from "./label-visuals";
import { EMOJI_VALUES } from "./emoji";

export const moneySchema = z
  .string()
  .regex(
    /^(0|[1-9][0-9]{0,23})$/,
    "Nhập số tiền VND nguyên, không âm, tối đa 24 chữ số.",
  );
export const monthSchema = z
  .string()
  .regex(/^(20[0-9]{2})-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ.");
export const dateSchema = z
  .string()
  .regex(/^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
  .refine(
    (v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    "Ngày không hợp lệ.",
  );
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
