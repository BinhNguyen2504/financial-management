import { commandFingerprint } from "./shared/command-fingerprint";
import { applyAction, view, GoalError } from "../domain/goals/engine";
import {
  commandSchema,
  type GoalBook,
  type GoalCommand,
  type GoalSources,
} from "../domain/goals/schema";
import type { Clock } from "../domain/shared/types";

export type GoalPreviewState = {
  goals: GoalBook["goals"];
  states: ReturnType<typeof view>["states"];
};
function previewState(state: ReturnType<typeof view>): GoalPreviewState {
  // Receipts must not embed the growing ledger/audit on every command.
  return { goals: state.book?.goals ?? [], states: state.states };
}
export type GoalCommandResult = {
  version: number;
  before: GoalPreviewState;
  after: GoalPreviewState;
};
export interface GoalTransactionRepository {
  read(): Promise<GoalBook | null>;
  sources(today: string): Promise<GoalSources>;
  command(
    id: string,
  ): Promise<{ fingerprint: string; result: GoalCommandResult } | null>;
  save(book: GoalBook): Promise<void>;
  remember(
    id: string,
    value: { fingerprint: string; result: GoalCommandResult },
  ): Promise<void>;
}
export interface GoalRepository {
  transaction<T>(
    owner: string,
    fn: (tx: GoalTransactionRepository) => Promise<T>,
  ): Promise<T>;
}
export function readGoalView(
  repository: GoalRepository,
  owner: string,
  clock: Clock,
) {
  return repository.transaction(owner, async (tx) =>
    view(await tx.read(), await tx.sources(clock.today), clock),
  );
}
export function runGoalCommand(
  repository: GoalRepository,
  owner: string,
  raw: GoalCommand,
  clock: Clock,
  preview = false,
) {
  const command = commandSchema.parse(raw),
    fingerprint = commandFingerprint(command);
  return repository.transaction(owner, async (tx) => {
    const stored = await tx.command(command.id);
    if (stored) {
      if (stored.fingerprint !== fingerprint)
        throw new GoalError(
          "Mã yêu cầu đã dùng với nội dung khác.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      return stored.result;
    }
    const before = await tx.read();
    if ((before?.version ?? 0) !== command.expectedVersion)
      throw new GoalError(
        "Dữ liệu đã đổi ở phiên khác. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.",
        409,
        "VERSION_CONFLICT",
      );
    const sources = await tx.sources(clock.today);
    // Only source modules used by this action need to match the preview.
    const action = command.action;
    const goal =
      action.type === "saveGoal"
        ? action.goal
        : action.type === "setStatus"
          ? before?.goals.find((g) => g.id === action.goalId)
          : undefined;
    for (const kind of new Set(goal?.links.map((l) => l.kind) ?? []))
      if (sources.versions[kind] !== command.expectedSources[kind])
        throw new GoalError(
          "Nguồn tiền đã thay đổi. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.",
          409,
          "SOURCE_VERSION_CONFLICT",
        );
    const after = applyAction(before, action, sources, clock);
    const result = {
      version: after.version,
      before: previewState(view(before, sources, clock)),
      after: previewState(view(after, sources, clock)),
    };
    if (!preview) {
      await tx.save(after);
      await tx.remember(command.id, { fingerprint, result });
    }
    return result;
  });
}
