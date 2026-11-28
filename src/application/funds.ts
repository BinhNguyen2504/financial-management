import type { CommandViewOptions } from "./shared/command-view";
import type { FundView } from "../domain/funds/types";
import { commandFingerprint } from "./shared/command-fingerprint";
import { applyAction, FundError, toView } from "../domain/funds/engine";
import { commandSchema, type FundCommand } from "../domain/funds/schema";
import type { FundBook, FundState, LivingSource } from "../domain/funds/types";
import { savingsSources } from "../domain/funds/savings-sources";
import type { SavingsBook } from "../domain/savings/types";
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
  savings(): Promise<SavingsBook | null>;
  command(id: string): Promise<FundStoredCommand | null>;
  save(book: FundBook): Promise<void>;
  remember(id: string, value: FundStoredCommand): Promise<void>;
}
export interface FundRepository {
  transaction<T>(
    owner: string,
    fn: (tx: FundTransactionRepository) => Promise<T>,
    readOnly?: boolean,
  ): Promise<T>;
}
export async function runFundCommand(
  repository: FundRepository,
  owner: string,
  raw: FundCommand,
  clock: Clock,
  preview = false,
  options: CommandViewOptions = {},
): Promise<FundCommandResult & { view?: FundView }> {
  const command = commandSchema.parse(raw),
    fingerprint = commandFingerprint(command);
  return repository.transaction(
    owner,
    async (tx) => {
      const readSavings = async () =>
        savingsSources(await tx.savings(), clock.today);
      const stored = await tx.command(command.id);
      if (stored) {
        if (stored.fingerprint !== fingerprint)
          throw new FundError(
            "Mã yêu cầu đã dùng với nội dung khác.",
            409,
            "IDEMPOTENCY_CONFLICT",
          );
        return options.view && !preview
          ? {
              ...stored.result,
              view: toView(
                await tx.read(),
                await tx.source(clock.today.slice(0, 7)),
                clock,
                await readSavings(),
              ),
            }
          : stored.result;
      }
      const before = await tx.read();
      if ((before?.version ?? 0) !== command.expectedVersion)
        throw new FundError(
          "Dữ liệu đã đổi ở phiên khác. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.",
          409,
          "VERSION_CONFLICT",
        );
      const source = await tx.source(clock.today.slice(0, 7)),
        savings = await readSavings(),
        action = command.action,
        after = applyAction(before, action, source, clock);
      // Checked here, not in the ledger rules: Savings history may change after a link is saved.
      // Renaming or moving a live link stays possible after its category is archived or cleared.
      if (
        action.type === "saveLocation" &&
        action.savings &&
        action.active &&
        !before?.locations.find((l) => l.id === action.id)?.active &&
        !savings.some(
          (s) => s.categoryId === action.savings!.categoryId && s.active,
        )
      )
        throw new FundError(
          "Chọn danh mục Tiết kiệm tiền mặt hoặc tiền gửi đang hoạt động.",
        );
      const result: FundCommandResult = {
        version: after.version,
        before: toView(before, source, clock, savings).state,
        after: toView(after, source, clock, savings).state,
        beforeConfig: before?.configurations.at(-1) ?? null,
        afterConfig: after.configurations.at(-1)!,
      };
      if (!preview) {
        await tx.save(after);
        await tx.remember(command.id, { fingerprint, result });
      }
      return options.view && !preview
        ? { ...result, view: toView(await tx.read(), source, clock, savings) }
        : result;
    },
    preview,
  );
}
export function readFundView(
  repository: FundRepository,
  owner: string,
  clock: Clock,
) {
  return repository.transaction(
    owner,
    async (tx) =>
      toView(
        await tx.read(),
        await tx.source(clock.today.slice(0, 7)),
        clock,
        savingsSources(await tx.savings(), clock.today),
      ),
    true,
  );
}
