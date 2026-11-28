import type { CommandViewOptions } from "./shared/command-view";
import type { SavingsView } from "../domain/savings/types";
import { commandFingerprint } from "./shared/command-fingerprint";
import { applyAction, SavingsError, toView } from "../domain/savings/engine";
import { commandSchema, type SavingsCommand } from "../domain/savings/schema";
import type { Clock, SavingsBook, SavingsState } from "../domain/savings/types";
import { hasSavingsLink } from "../domain/funds/engine";
import { fundImpact, type FundImpact } from "../domain/funds/savings-impact";
import { savingsSources } from "../domain/funds/savings-sources";
import type { FundBook } from "../domain/funds/types";
export interface CommandResult {
  version: number;
  before: SavingsState;
  after: SavingsState;
}
/** Returned by preview only; command receipts and backups keep their original shape. */
export interface FundImpactWarning {
  fundsVersion: number;
  funds: FundImpact[];
}
export interface StoredCommand {
  fingerprint: string;
  result: CommandResult;
}
export interface SavingsTransactionRepository {
  read(): Promise<SavingsBook | null>;
  command(id: string): Promise<StoredCommand | null>;
  fundBook(): Promise<FundBook | null>;
  save(book: SavingsBook): Promise<void>;
  remember(id: string, value: StoredCommand): Promise<void>;
}
export interface SavingsRepository {
  transaction<T>(
    owner: string,
    fn: (tx: SavingsTransactionRepository) => Promise<T>,
    readOnly?: boolean,
  ): Promise<T>;
}
export async function runSavingsCommand(
  repository: SavingsRepository,
  owner: string,
  raw: SavingsCommand,
  clock: Clock,
  preview = false,
  options: CommandViewOptions = {},
): Promise<
  CommandResult & {
    view?: SavingsView;
    fundImpact?: FundImpactWarning | null;
  }
> {
  const command = commandSchema.parse(raw),
    fingerprint = commandFingerprint(command);
  return repository.transaction(
    owner,
    async (tx) => {
      const stored = await tx.command(command.id);
      if (stored) {
        if (stored.fingerprint !== fingerprint)
          throw new SavingsError(
            "Mã yêu cầu đã dùng với nội dung khác.",
            409,
            "IDEMPOTENCY_CONFLICT",
          );
        return options.view && !preview
          ? {
              ...stored.result,
              view: toView(await tx.read(), options.asOf ?? clock.today, clock),
            }
          : stored.result;
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
      const funds = await tx.fundBook();
      // Without a link the Fund ledger cannot be affected, so it is not replayed.
      const affected = hasSavingsLink(funds)
        ? fundImpact(
            funds,
            savingsSources(before, clock.today),
            savingsSources(after, clock.today),
          )
        : [];
      const warning = affected.length
        ? { fundsVersion: funds!.version, funds: affected }
        : null;
      if (!preview) {
        if (
          warning &&
          command.acknowledgedFundsVersion !== warning.fundsVersion
        )
          throw new SavingsError(
            "Giao dịch này làm giảm Quỹ an toàn. Xem trước lại và xác nhận cảnh báo trước khi lưu.",
            409,
            "FUND_IMPACT_CONFIRMATION_REQUIRED",
          );
        await tx.save(after);
        await tx.remember(command.id, { fingerprint, result });
      }
      if (preview) return { ...result, fundImpact: warning };
      return options.view
        ? {
            ...result,
            view: toView(await tx.read(), options.asOf ?? clock.today, clock),
          }
        : result;
    },
    preview,
  );
}
export function readSavingsView(
  repository: SavingsRepository,
  owner: string,
  asOf: string,
  clock: Clock,
) {
  return repository.transaction(
    owner,
    async (tx) => toView(await tx.read(), asOf, clock),
    true,
  );
}
