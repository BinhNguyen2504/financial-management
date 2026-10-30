import { z } from "zod";
import { dateSchema, moneySchema } from "../shared/schema";

const version = z.number().int().min(0).max(2147483646);
const note = z.string().trim().max(1000);
const positive = moneySchema.refine(
  (v) => BigInt(v) > 0n,
  "Số tiền phải lớn hơn 0.",
);
// A goal may observe several independently valid 24-digit sources.
export const aggregateMoneySchema = z.string().regex(/^(0|[1-9]\d{0,27})$/);
export const sourceKindSchema = z.enum(["savings", "investments", "funds"]);
export const linkSchema = z.strictObject({
  kind: sourceKindSchema,
  sourceId: z.string().min(1).max(100),
  // Integer basis points avoid floating point allocation errors.
  share: z.number().int().min(1).max(10000),
});
export const sourceSchema = z.strictObject({
  kind: sourceKindSchema,
  sourceId: z.string(),
  name: z.string(),
  active: z.boolean(),
  capital: moneySchema,
  value: moneySchema.nullable(),
  valueDate: dateSchema.nullable(),
  stale: z.boolean(),
});
export const sourcesSchema = z.strictObject({
  versions: z.strictObject({
    savings: version.nullable(),
    investments: version.nullable(),
    funds: version.nullable(),
  }),
  items: z.array(sourceSchema),
});
export const goalInputSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  note,
  purpose: z.enum(["spending", "milestone"]),
  mode: z.enum(["linked", "ledger"]),
  basis: z.enum(["capital", "value"]),
  target: positive,
  deadline: dateSchema.nullable(),
  monthly: moneySchema,
  links: z.array(linkSchema).max(100),
});
export const transactionSchema = z.strictObject({
  id: z.uuid(),
  goalId: z.uuid(),
  kind: z.enum(["opening", "deposit", "withdraw", "transfer"]),
  toGoalId: z.uuid().nullable(),
  amount: positive,
  occurredAt: z.iso.datetime({ offset: true }),
  note,
});
export const actionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("saveGoal"), goal: goalInputSchema }),
  z.strictObject({
    type: z.literal("setStatus"),
    goalId: z.uuid(),
    status: z.enum(["active", "paused", "completed", "archived"]),
    reason: note,
  }),
  z.strictObject({
    type: z.literal("reorder"),
    ids: z.array(z.uuid()).max(1000),
  }),
  z.strictObject({
    type: z.literal("postTransaction"),
    transaction: transactionSchema,
  }),
  z.strictObject({
    type: z.literal("reviseTransaction"),
    transactionId: z.uuid(),
    replacement: transactionSchema.nullable(),
    reason: note.min(1),
  }),
]);
export const commandSchema = z.strictObject({
  id: z.uuid(),
  expectedVersion: version,
  expectedSources: sourcesSchema.shape.versions,
  action: actionSchema,
});
export const completionSchema = z.strictObject({
  at: z.iso.datetime({ offset: true }),
  current: aggregateMoneySchema,
  target: positive,
  sources: sourcesSchema,
});
export const definitionSchema = goalInputSchema.extend({
  status: z.enum(["active", "paused", "completed", "archived"]),
  rank: z.number().int().min(0),
  completion: completionSchema.nullable(),
});
export const revisionSchema = z.strictObject({
  id: z.string().min(1).max(100),
  rootId: z.uuid(),
  sequence: version,
  transaction: transactionSchema.nullable(),
  reason: note,
});
export const auditSchema = z.strictObject({
  version,
  at: z.iso.datetime({ offset: true }),
  today: dateSchema,
  action: actionSchema,
  sources: sourcesSchema,
});
export const bookSchema = z.strictObject({
  version,
  goals: z.array(definitionSchema),
  revisions: z.array(revisionSchema),
  audit: z.array(auditSchema),
});
export type Goal = z.infer<typeof definitionSchema>;
export type GoalAction = z.infer<typeof actionSchema>;
export type GoalCommand = z.infer<typeof commandSchema>;
export type GoalTransaction = z.infer<typeof transactionSchema>;
export type GoalBook = z.infer<typeof bookSchema>;
export type GoalSources = z.infer<typeof sourcesSchema>;
export type GoalSource = z.infer<typeof sourceSchema>;
