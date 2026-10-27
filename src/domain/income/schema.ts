import { yearSchema } from "../shared/schema";
import { moneySchema } from "../shared/schema";

import { monthSchema } from "../shared/schema";
import { z } from "zod";
const id = z.uuid();
const name = z.string().trim().min(1, "Cần nhập tên.").max(100);
const description = z.string().trim().max(1000);
export const incomeActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("createCategory"),
      id,
      start: monthSchema,
      name,
      description,
    })
    .strict(),
  z
    .object({
      type: z.literal("configureCategory"),
      categoryId: id,
      month: monthSchema,
      name,
      description,
    })
    .strict(),
  z
    .object({
      type: z.literal("stopCategory"),
      categoryId: id,
      month: monthSchema,
    })
    .strict(),
  z.object({ type: z.literal("deleteCategory"), categoryId: id }).strict(),
  z
    .object({
      type: z.literal("setMonthly"),
      categoryId: id,
      month: monthSchema,
      amount: moneySchema,
      note: description,
    })
    .strict(),
  z
    .object({
      type: z.literal("clearMonthly"),
      categoryId: id,
      month: monthSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("upsertOneOff"),
      id,
      month: monthSchema,
      name,
      description,
      amount: moneySchema.refine(
        (v) => BigInt(v) > 0n,
        "Số tiền phải lớn hơn 0.",
      ),
    })
    .strict(),
  z.object({ type: z.literal("deleteOneOff"), id }).strict(),
]);
export type IncomeAction = z.infer<typeof incomeActionSchema>;
export const commandSchema = z
  .object({
    id,
    expectedVersion: z.number().int().min(0),
    action: incomeActionSchema,
  })
  .strict();
export type IncomeCommand = z.infer<typeof commandSchema>;

export { monthSchema };

export { yearSchema };

export { moneySchema };
