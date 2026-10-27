import { z } from "zod";
import {
  expenseMoneySchema as moneySchema,
  expenseMonthSchema as monthSchema,
} from "../shared/schema";
export const fundIds = ["emergency", "rainy_day", "sinking"] as const;
export const fundIdSchema = z.enum(fundIds);
const name = z.string().trim().min(1).max(100);
const note = z.string().trim().max(1000);
const version = z.number().int().min(0).max(2147483646);
export const multiplierSchema = z
  .string()
  .max(24)
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/)
  .pipe(
    z
      .string()
      .refine((v) => BigInt(v.replace(".", "")) > 0n, "Hệ số phải lớn hơn 0."),
  );
export const multipliersSchema = z.strictObject({
  emergency: multiplierSchema,
  rainy_day: multiplierSchema,
  sinking: multiplierSchema,
});
export const prioritySchema = z
  .array(fundIdSchema)
  .length(3)
  .refine((v) => new Set(v).size === 3, "Mỗi quỹ xuất hiện đúng một lần.");
export const livingSnapshotSchema = z.strictObject({
  expenseVersion: version,
  month: monthSchema,
  total: moneySchema,
  items: z
    .array(z.strictObject({ jarId: z.uuid(), name, amount: moneySchema }))
    .min(1),
});
export const configurationSchema = z.strictObject({
  id: z.uuid(),
  sequence: version.refine((v) => v > 0),
  at: z.iso.datetime({ offset: true }),
  living: livingSnapshotSchema,
  multipliers: multipliersSchema,
  priority: prioritySchema,
});
export const locationSchema = z.strictObject({
  id: z.uuid(),
  name,
  active: z.boolean(),
});
const transactionFields = {
  id: z.uuid(),
  fundId: fundIdSchema,
  locationId: z.uuid(),
  amount: moneySchema.pipe(
    z.string().refine((v) => BigInt(v) > 0n, "Số tiền phải lớn hơn 0."),
  ),
  occurredAt: z.iso.datetime({ offset: true }),
  note,
};
export const transactionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...transactionFields,
    kind: z.enum(["opening", "deposit"]),
  }),
  z.strictObject({
    ...transactionFields,
    kind: z.literal("withdraw"),
    note: note.refine((v) => v.length > 0, "Nhập lý do rút tiền."),
  }),
  z.strictObject({
    ...transactionFields,
    kind: z.literal("transfer"),
    toFundId: fundIdSchema,
    toLocationId: z.uuid(),
    note: note.refine((v) => v.length > 0, "Nhập lý do chuyển tiền."),
  }),
]);
export const revisionSchema = z.strictObject({
  id: z.string().min(1).max(100),
  rootId: z.uuid(),
  sequence: version.refine((v) => v > 0),
  transaction: transactionSchema.nullable(),
  reason: note,
});
export const actionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("configure"),
    id: z.uuid(),
    jarIds: z
      .array(z.uuid())
      .min(1)
      .refine((v) => new Set(v).size === v.length),
    multipliers: multipliersSchema,
    priority: prioritySchema,
    applyLiving: z.boolean(),
    expectedExpenseVersion: version,
    sourceMonth: monthSchema,
  }),
  z.strictObject({
    type: z.literal("saveLocation"),
    id: z.uuid(),
    name,
    active: z.boolean(),
  }),
  z.strictObject({
    type: z.literal("postTransaction"),
    transaction: transactionSchema,
  }),
  z.strictObject({
    type: z.literal("reviseTransaction"),
    transactionId: z.uuid(),
    replacement: transactionSchema.nullable(),
    reason: note.refine((v) => v.length > 0, "Nhập lý do sửa hoặc hủy."),
  }),
]);
export const commandSchema = z.strictObject({
  id: z.uuid(),
  expectedVersion: version,
  action: actionSchema,
});
export const auditSchema = z.strictObject({
  version: version.refine((v) => v > 0),
  at: z.iso.datetime({ offset: true }),
  action: actionSchema,
});
export type FundAction = z.infer<typeof actionSchema>;
export type FundCommand = z.infer<typeof commandSchema>;
export type FundTransaction = z.infer<typeof transactionSchema>;
export type FundId = z.infer<typeof fundIdSchema>;
export type LivingExpenseSnapshot = z.infer<typeof livingSnapshotSchema>;
