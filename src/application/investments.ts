import { commandFingerprint } from "./shared/command-fingerprint";
import {
  applyAction,
  InvestmentError,
  toView,
} from "../domain/investments/engine";
import {
  commandSchema,
  type InvestmentCommand,
} from "../domain/investments/schema";
import type {
  Clock,
  InvestmentBook,
  InvestmentState,
} from "../domain/investments/types";
export interface CommandResult {
  version: number;
  before: InvestmentState;
  after: InvestmentState;
}
export interface StoredCommand {
  fingerprint: string;
  result: CommandResult;
}
export interface InvestmentTransactionRepository {
  read(): Promise<InvestmentBook | null>;
  command(id: string): Promise<StoredCommand | null>;
  save(book: InvestmentBook): Promise<void>;
  remember(id: string, value: StoredCommand): Promise<void>;
}
export interface InvestmentRepository {
  transaction<T>(
    owner: string,
    fn: (tx: InvestmentTransactionRepository) => Promise<T>,
  ): Promise<T>;
}
export async function runInvestmentCommand(
  repository: InvestmentRepository,
  owner: string,
  raw: InvestmentCommand,
  clock: Clock,
  preview = false,
): Promise<CommandResult> {
  const command = commandSchema.parse(raw),
    fingerprint = commandFingerprint(command);
  return repository.transaction(owner, async (tx) => {
    const stored = await tx.command(command.id);
    if (stored) {
      if (stored.fingerprint !== fingerprint)
        throw new InvestmentError(
          "Mã yêu cầu đã dùng với nội dung khác.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      return stored.result;
    }
    const before = await tx.read();
    if ((before?.version ?? 0) !== command.expectedVersion)
      throw new InvestmentError(
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
export function readInvestmentView(
  repository: InvestmentRepository,
  owner: string,
  asOf: string,
  clock: Clock,
) {
  return repository.transaction(owner, async (tx) =>
    toView(await tx.read(), asOf, clock),
  );
}
