import { createHash } from "node:crypto";
import { applyAction, IncomeError, toView } from "../domain/income/engine";
import { commandSchema, type IncomeCommand } from "../domain/income/schema";
import type { Clock, IncomeBook } from "../domain/income/types";
export interface IncomeChange {
  kind: "fixed" | "oneoff";
  month: string;
  key: string;
  before: string | null;
  after: string | null;
  beforeName: string | null;
  afterName: string | null;
  beforeActive: boolean | null;
  afterActive: boolean | null;
}
export interface CommandResult {
  version: number;
  changes: IncomeChange[];
  effectiveFrom: string | null;
}
export interface StoredCommand {
  fingerprint: string;
  result: CommandResult;
}
export interface IncomeTransaction {
  read(): Promise<IncomeBook | null>;
  command(id: string): Promise<StoredCommand | null>;
  save(book: IncomeBook): Promise<void>;
  remember(id: string, value: StoredCommand): Promise<void>;
}
export interface IncomeRepository {
  transaction<T>(
    owner: string,
    fn: (tx: IncomeTransaction) => Promise<T>,
  ): Promise<T>;
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.entries(v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
export async function runIncomeCommand(
  repository: IncomeRepository,
  owner: string,
  input: IncomeCommand,
  clock: Clock,
  preview = false,
): Promise<CommandResult> {
  const command = commandSchema.parse(input);
  const fingerprint = createHash("sha256")
    .update(canonical(command))
    .digest("hex");
  return repository.transaction(owner, async (tx) => {
    const remembered = await tx.command(command.id);
    if (remembered) {
      if (remembered.fingerprint !== fingerprint)
        throw new IncomeError(
          "Mã yêu cầu đã được dùng với nội dung khác.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      return remembered.result;
    }
    const before = await tx.read();
    if ((before?.version ?? 0) !== command.expectedVersion)
      throw new IncomeError(
        "Dữ liệu đã thay đổi trên phiên khác. Tải lại dữ liệu rồi thử lại; nội dung đang nhập vẫn được giữ.",
        409,
        "VERSION_CONFLICT",
      );
    const after = applyAction(before, command.action, clock);
    const changes: IncomeChange[] = [];
    const yearSet = new Set([Number(clock.today.slice(0, 4))]);
    for (const b of [before, after])
      if (b)
        for (const m of [
          ...b.categories.map((c) => c.start),
          ...b.categories.flatMap((c) => c.rules.map((r) => r.month)),
          ...b.monthly.map((r) => r.month),
          ...b.oneOffs.map((r) => r.month),
        ])
          yearSet.add(Number(m.slice(0, 4)));
    for (const year of yearSet) {
      const oldRows = toView(before, year, clock).rows;
      const newRows = toView(after, year, clock).rows;
      const keys = new Set(
        [...oldRows, ...newRows].map((r) => `${r.kind}/${r.key}/${r.month}`),
      );
      for (const key of keys) {
        const a = oldRows.find((r) => `${r.kind}/${r.key}/${r.month}` === key);
        const b = newRows.find((r) => `${r.kind}/${r.key}/${r.month}` === key);
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
        changes.push({
          kind: (b ?? a)!.kind,
          month: (b ?? a)!.month,
          key: (b ?? a)!.key,
          before: a?.amount ?? null,
          after: b?.amount ?? null,
          beforeName: a?.name ?? null,
          afterName: b?.name ?? null,
          beforeActive: a?.active ?? null,
          afterActive: b?.active ?? null,
        });
      }
    }
    const result = {
      version: after.version,
      changes,
      effectiveFrom:
        "month" in command.action
          ? command.action.month
          : "start" in command.action
            ? command.action.start
            : null,
    };
    if (!preview) {
      await tx.save(after);
      await tx.remember(command.id, { fingerprint, result });
    }
    return result;
  });
}
export async function readIncomeView(
  repository: IncomeRepository,
  owner: string,
  year: number,
  clock: Clock,
) {
  return repository.transaction(owner, async (tx) =>
    toView(await tx.read(), year, clock),
  );
}
