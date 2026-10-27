import { commandFingerprint } from "./shared/command-fingerprint";
import { applyAction, SavingsError, toView } from "../domain/savings/engine";
import { commandSchema, type SavingsCommand } from "../domain/savings/schema";
import type { Clock, SavingsBook, SavingsState } from "../domain/savings/types";
export interface CommandResult {
  version: number;
  before: SavingsState;
  after: SavingsState;
}
export interface StoredCommand {
  fingerprint: string;
  result: CommandResult;
}
export interface SavingsTransactionRepository {
  read(): Promise<SavingsBook | null>;
  command(id: string): Promise<StoredCommand | null>;
  save(book: SavingsBook): Promise<void>;
  remember(id: string, value: StoredCommand): Promise<void>;
}
export interface SavingsRepository {
  transaction<T>(
    owner: string,
    fn: (tx: SavingsTransactionRepository) => Promise<T>,
  ): Promise<T>;
}
export async function runSavingsCommand(
  repository: SavingsRepository,
  owner: string,
  raw: SavingsCommand,
  clock: Clock,
  preview = false,
): Promise<CommandResult> {
  const command = commandSchema.parse(raw),
    fingerprint = commandFingerprint(command);
  return repository.transaction(owner, async (tx) => {
    const stored = await tx.command(command.id);
    if (stored) {
      if (stored.fingerprint !== fingerprint)
        throw new SavingsError(
          "Mã yêu cầu đã dùng với nội dung khác.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      return stored.result;
    }
    const before = await tx.read();
    if ((before?.version ?? 0) !== command.expectedVersion)
      throw new SavingsError(
        "Dữ liệu đã đổi ở phiên khác. Tải lại phiên bản rồi xem trước; nội dung đang nhập được giữ.",
        409,
        "VERSION_CONFLICT",
      );
    const after = applyAction(before, command.action, clock);
    const result = {
      version: after.version,
      before: toView(before, clock.today, clock).state,
      after: toView(after, clock.today, clock).state,
    };
    if (!preview) {
      await tx.save(after);
      await tx.remember(command.id, { fingerprint, result });
    }
    return result;
  });
}
export function readSavingsView(
  repository: SavingsRepository,
  owner: string,
  asOf: string,
  clock: Clock,
) {
  return repository.transaction(owner, async (tx) =>
    toView(await tx.read(), asOf, clock),
  );
}
