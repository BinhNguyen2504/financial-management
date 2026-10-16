import { createHash } from "node:crypto";
import {
  applyAction,
  changes,
  ExpenseError,
  toView,
} from "../domain/expenses/engine";
import { commandSchema, type ExpenseCommand } from "../domain/expenses/schema";
import type { Clock, ExpenseBook, RowChange } from "../domain/expenses/types";

export interface CommandResult {
  version: number;
  changes: RowChange[];
}
export interface StoredCommand {
  fingerprint: string;
  result: CommandResult;
}
export interface ExpenseTransaction {
  read(): Promise<ExpenseBook | null>;
  command(id: string): Promise<StoredCommand | null>;
  save(book: ExpenseBook): Promise<void>;
  remember(id: string, value: StoredCommand): Promise<void>;
}
export interface ExpenseRepository {
  transaction<T>(
    owner: string,
    fn: (transaction: ExpenseTransaction) => Promise<T>,
  ): Promise<T>;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export async function runExpenseCommand(
  repository: ExpenseRepository,
  owner: string,
  input: ExpenseCommand,
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
        throw new ExpenseError(
          "Mã yêu cầu đã được dùng với nội dung khác.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      return remembered.result;
    }
    const before = await tx.read();
    if ((before?.version ?? 0) !== command.expectedVersion)
      throw new ExpenseError(
        "Dữ liệu đã thay đổi trên phiên khác. Tải lại dữ liệu rồi xem trước lại; nội dung bạn nhập vẫn được giữ.",
        409,
        "VERSION_CONFLICT",
      );
    const after = applyAction(before, command.action, clock);
    const result = {
      version: after.version,
      changes: changes(before, after, clock),
    };
    if (!preview) {
      await tx.save(after);
      await tx.remember(command.id, { fingerprint, result });
    }
    return result;
  });
}
export async function readExpenseView(
  repository: ExpenseRepository,
  owner: string,
  clock: Clock,
) {
  return repository.transaction(owner, async (tx) =>
    toView(await tx.read(), clock),
  );
}
