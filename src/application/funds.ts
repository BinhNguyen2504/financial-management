import { createHash } from "node:crypto";
import { applyAction, FundError, toView } from "../domain/funds/engine";
import { commandSchema, type FundCommand } from "../domain/funds/schema";
import type { FundBook, FundState, LivingSource } from "../domain/funds/types";
import type { Clock } from "../domain/expenses/types";
export interface FundCommandResult {
  version: number;
  before: FundState;
  after: FundState;
  beforeConfig: FundBook["configurations"][number] | null;
  afterConfig: FundBook["configurations"][number];
}
export interface FundStoredCommand {
  fingerprint: string;
  result: FundCommandResult;
}
export interface FundTransactionRepository {
  read(): Promise<FundBook | null>;
  source(month: string): Promise<LivingSource>;
  command(id: string): Promise<FundStoredCommand | null>;
  save(book: FundBook): Promise<void>;
  remember(id: string, value: FundStoredCommand): Promise<void>;
}
export interface FundRepository {
  transaction<T>(
    owner: string,
    fn: (tx: FundTransactionRepository) => Promise<T>,
  ): Promise<T>;
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.entries(v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
export async function runFundCommand(
  repository: FundRepository,
  owner: string,
  raw: FundCommand,
  clock: Clock,
  preview = false,
): Promise<FundCommandResult> {
  const command = commandSchema.parse(raw),
    fingerprint = createHash("sha256").update(canonical(command)).digest("hex");
  return repository.transaction(owner, async (tx) => {
    const stored = await tx.command(command.id);
    if (stored) {
      if (stored.fingerprint !== fingerprint)
        throw new FundError(
          "Mã yêu cầu đã dùng với nội dung khác.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      return stored.result;
    }
    const before = await tx.read();
    if ((before?.version ?? 0) !== command.expectedVersion)
      throw new FundError(
        "Dữ liệu đã đổi ở phiên khác. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.",
        409,
        "VERSION_CONFLICT",
      );
    const source = await tx.source(clock.today.slice(0, 7)),
      after = applyAction(before, command.action, source, clock);
    const result: FundCommandResult = {
      version: after.version,
      before: toView(before, source, clock).state,
      after: toView(after, source, clock).state,
      beforeConfig: before?.configurations.at(-1) ?? null,
      afterConfig: after.configurations.at(-1)!,
    };
    if (!preview) {
      await tx.save(after);
      await tx.remember(command.id, { fingerprint, result });
    }
    return result;
  });
}
export function readFundView(
  repository: FundRepository,
  owner: string,
  clock: Clock,
) {
  return repository.transaction(owner, async (tx) =>
    toView(await tx.read(), await tx.source(clock.today.slice(0, 7)), clock),
  );
}
