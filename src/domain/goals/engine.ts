import {
  actionSchema,
  bookSchema,
  type Goal,
  type GoalAction,
  type GoalBook,
  type GoalSources,
  type GoalTransaction,
} from "./schema";
import type { Clock } from "../shared/types";

export class GoalError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_GOAL",
  ) {
    super(message);
  }
}
function requireGoal(value: unknown, message: string): asserts value {
  if (!value) throw new GoalError(message);
}
export const sourceKey = (link: { kind: string; sourceId: string }) =>
  `${link.kind}:${link.sourceId}`;
export const emptyBook = (): GoalBook => ({
  version: 0,
  goals: [],
  revisions: [],
  audit: [],
});
export function activeTransactions(book: GoalBook) {
  const latest = new Map<string, GoalBook["revisions"][number]>();
  const order = new Map<string, number>();
  for (const r of book.revisions) {
    latest.set(r.rootId, r);
    if (!order.has(r.rootId)) order.set(r.rootId, r.sequence);
  }
  return [...latest.values()]
    .filter((r) => r.transaction !== null)
    .map((r) => ({ transaction: r.transaction!, order: order.get(r.rootId)! }))
    .sort(
      (a, b) =>
        Date.parse(a.transaction.occurredAt) -
          Date.parse(b.transaction.occurredAt) || a.order - b.order,
    );
}
export function balances(book: GoalBook) {
  const result: Record<string, string> = Object.fromEntries(
    book.goals.map((g) => [g.id, "0"]),
  );
  const touched = new Set<string>();
  const add = (id: string, delta: bigint) => {
    requireGoal(
      book.goals.some((g) => g.id === id && g.mode === "ledger"),
      "Mục tiêu dùng sổ riêng không tồn tại.",
    );
    const amount = BigInt(result[id]) + delta;
    requireGoal(
      amount >= 0n && amount.toString().length <= 24,
      "Số dư phải không âm ở mọi thời điểm và không quá 24 chữ số.",
    );
    result[id] = amount.toString();
    touched.add(id);
  };
  for (const { transaction: t } of activeTransactions(book)) {
    requireGoal(
      (t.kind === "transfer") === (t.toGoalId !== null),
      "Chọn mục tiêu nhận cho giao dịch chuyển.",
    );
    if (t.kind === "opening")
      requireGoal(
        !touched.has(t.goalId),
        "Số dư ban đầu phải là giao dịch đầu tiên.",
      );
    if (t.kind === "transfer")
      requireGoal(t.goalId !== t.toGoalId, "Chọn hai mục tiêu khác nhau.");
    add(
      t.goalId,
      BigInt(t.amount) * (["withdraw", "transfer"].includes(t.kind) ? -1n : 1n),
    );
    if (t.kind === "transfer") add(t.toGoalId!, BigInt(t.amount));
  }
  return result;
}
function linkedCurrent(goal: Goal, sources: GoalSources): string | null {
  let sum = 0n;
  for (const link of goal.links) {
    const s = sources.items.find((s) => sourceKey(s) === sourceKey(link));
    if (!s || sources.versions[link.kind] === null) return null;
    const amount = goal.basis === "capital" ? s.capital : s.value;
    if (amount === null) return null;
    sum += (BigInt(amount) * BigInt(link.share)) / 10000n;
  }
  return sum.toString();
}
export function goalState(
  goal: Goal,
  book: GoalBook,
  sources: GoalSources,
  clock: Clock,
) {
  const balance = goal.mode === "ledger" ? balances(book)[goal.id] : null;
  const current =
    goal.completion && ["completed", "archived"].includes(goal.status)
      ? goal.completion.current
      : goal.mode === "ledger"
        ? balance
        : linkedCurrent(goal, sources);
  const remaining =
    current === null
      ? null
      : (BigInt(goal.target) > BigInt(current)
          ? BigInt(goal.target) - BigInt(current)
          : 0n
        ).toString();
  const index = (date: string) =>
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
  const overdue =
    goal.deadline !== null && goal.deadline < clock.today && remaining !== "0";
  const months =
    goal.deadline && !overdue
      ? index(goal.deadline) - index(clock.today) + 1
      : null;
  const requiredMonthly =
    remaining !== null && months !== null && months > 0
      ? ((BigInt(remaining) + BigInt(months) - 1n) / BigInt(months)).toString()
      : null;
  let estimatedMonth: string | null = null;
  if (
    remaining !== null &&
    BigInt(goal.monthly) > 0n &&
    goal.status === "active"
  ) {
    const periods =
      (BigInt(remaining) + BigInt(goal.monthly) - 1n) / BigInt(goal.monthly);
    if (periods < 1200n) {
      const target = index(clock.today) + Math.max(0, Number(periods) - 1);
      if (Math.floor(target / 12) <= 2099)
        estimatedMonth = `${Math.floor(target / 12)}-${String((target % 12) + 1).padStart(2, "0")}`;
    }
  }
  const percent =
    current === null ? null : (BigInt(current) * 10000n) / BigInt(goal.target);
  const stale =
    goal.mode === "linked" &&
    goal.basis === "value" &&
    goal.links.some(
      (l) => sources.items.find((s) => sourceKey(l) === sourceKey(s))?.stale,
    );
  return {
    id: goal.id,
    current,
    balance,
    remaining,
    percent:
      percent === null
        ? null
        : `${percent / 100n}.${String(percent % 100n).padStart(2, "0")}`,
    requiredMonthly,
    estimatedMonth,
    overdue,
    stale,
    ready: remaining === "0",
  };
}
export function view(
  book: GoalBook | null,
  sources: GoalSources,
  clock: Clock,
) {
  return {
    book,
    sources,
    today: clock.today,
    now: clock.now,
    states: (book?.goals ?? []).map((g) => goalState(g, book!, sources, clock)),
  };
}
export type GoalView = ReturnType<typeof view> & { dataGeneration?: number };
function allocations(book: GoalBook) {
  const used = new Map<string, number>();
  for (const g of book.goals.filter(
    (g) =>
      g.mode === "linked" &&
      g.purpose === "spending" &&
      ["active", "paused"].includes(g.status),
  ))
    for (const l of g.links)
      used.set(sourceKey(l), (used.get(sourceKey(l)) ?? 0) + l.share);
  requireGoal(
    [...used.values()].every((share) => share <= 10000),
    "Tổng tỷ lệ đã chia cho mỗi nguồn không được vượt 100%.",
  );
}
export function applyAction(
  previous: GoalBook | null,
  raw: GoalAction,
  sources: GoalSources,
  clock: Clock,
): GoalBook {
  const action = actionSchema.parse(raw),
    book = structuredClone(previous ?? emptyBook());
  const links =
    action.type === "saveGoal"
      ? action.goal.links
      : action.type === "setStatus"
        ? (book.goals.find((g) => g.id === action.goalId)?.links ?? [])
        : [];
  // Keep only sources needed to replay this action, rather than every account asset.
  const snapshotSources: GoalSources = {
    versions: { ...sources.versions },
    items: sources.items.filter((s) =>
      links.some((l) => sourceKey(l) === sourceKey(s)),
    ),
  };
  const find = (id: string) => {
    const g = book.goals.find((g) => g.id === id);
    requireGoal(g, "Mục tiêu không tồn tại.");
    return g;
  };
  const validateTransaction = (t: GoalTransaction, revising = false) => {
    requireGoal(
      Date.parse(t.occurredAt) <= Date.parse(clock.now),
      "Không ghi giao dịch trong tương lai.",
    );
    const g = find(t.goalId);
    requireGoal(
      g.mode === "ledger",
      "Chỉ ghi giao dịch cho mục tiêu dùng sổ riêng.",
    );
    if (!revising) {
      requireGoal(
        g.status !== "archived",
        "Mở lại mục tiêu trước khi ghi giao dịch.",
      );
      if (["opening", "deposit"].includes(t.kind))
        requireGoal(
          g.status === "active",
          "Mở lại mục tiêu trước khi góp thêm tiền.",
        );
    }
    if (["withdraw", "transfer"].includes(t.kind))
      requireGoal(t.note.length > 0, "Nhập lý do rút hoặc chuyển tiền.");
    if (t.kind === "transfer") {
      const to = find(t.toGoalId ?? "");
      requireGoal(
        to.mode === "ledger" && (revising || to.status === "active"),
        "Mục tiêu nhận phải đang hoạt động và dùng sổ riêng.",
      );
    }
  };
  if (action.type === "saveGoal") {
    const input = action.goal,
      old = book.goals.find((g) => g.id === input.id);
    if (old) {
      requireGoal(
        old.status === "active" || old.status === "paused",
        "Mở lại mục tiêu trước khi điều chỉnh.",
      );
      requireGoal(
        old.mode === input.mode && old.purpose === input.purpose,
        "Giữ loại mục tiêu và cách ghi nhận đã chọn.",
      );
    }
    requireGoal(
      input.mode === "linked"
        ? input.links.length > 0
        : input.links.length === 0,
      "Chọn nguồn cho mục tiêu liên kết; sổ riêng không dùng nguồn liên kết.",
    );
    requireGoal(
      new Set(input.links.map(sourceKey)).size === input.links.length,
      "Mỗi nguồn chỉ được chọn một lần.",
    );
    for (const link of input.links) {
      const source = sources.items.find(
        (s) => sourceKey(s) === sourceKey(link),
      );
      requireGoal(
        source && sources.versions[link.kind] !== null,
        "Nguồn liên kết chưa sẵn sàng.",
      );
      requireGoal(
        source.active ||
          old?.links.some((l) => sourceKey(l) === sourceKey(link)),
        "Nguồn đã ngừng không nhận liên kết mới.",
      );
      requireGoal(
        link.kind !== "funds" || input.purpose === "milestone",
        "Quỹ an toàn chỉ liên kết với cột mốc tài chính.",
      );
      requireGoal(
        input.purpose !== "milestone" || link.share === 10000,
        "Cột mốc theo dõi toàn bộ nguồn đã chọn.",
      );
    }
    const next: Goal = {
      ...input,
      status: old?.status ?? "active",
      rank: old?.rank ?? book.goals.length,
      completion: old?.completion ?? null,
    };
    if (old) book.goals[book.goals.indexOf(old)] = next;
    else book.goals.push(next);
  } else if (action.type === "setStatus") {
    const g = find(action.goalId);
    requireGoal(g.status !== action.status, "Mục tiêu đang ở trạng thái này.");
    if (action.status === "completed") {
      requireGoal(
        ["active", "paused"].includes(g.status),
        "Mở lại mục tiêu trước khi hoàn thành.",
      );
      const state = goalState(g, book, sources, clock);
      requireGoal(
        state.ready && state.current !== null,
        "Mục tiêu chưa đủ tiền hoặc thiếu dữ liệu nguồn.",
      );
      g.completion = {
        at: clock.now,
        current: state.current,
        target: g.target,
        sources: structuredClone(snapshotSources),
      };
    }
    if (action.status === "archived" && g.mode === "ledger")
      requireGoal(
        balances(book)[g.id] === "0",
        "Rút hoặc chuyển hết số dư trước khi lưu trữ.",
      );
    if (action.status === "paused")
      requireGoal(
        g.status === "active",
        "Chỉ tạm dừng mục tiêu đang hoạt động.",
      );
    if (action.status === "active") {
      for (const l of g.links)
        requireGoal(
          sources.items.some((s) => sourceKey(s) === sourceKey(l)) &&
            sources.versions[l.kind] !== null,
          "Nguồn liên kết chưa sẵn sàng.",
        );
      g.completion = null;
    }
    g.status = action.status;
  } else if (action.type === "reorder") {
    requireGoal(
      action.ids.length === book.goals.length &&
        new Set(action.ids).size === book.goals.length &&
        action.ids.every((id) => book.goals.some((g) => g.id === id)),
      "Danh sách ưu tiên phải chứa mỗi mục tiêu đúng một lần.",
    );
    action.ids.forEach((id, rank) => {
      find(id).rank = rank;
    });
  } else {
    let transaction: GoalTransaction | null,
      rootId: string,
      reason = "";
    if (action.type === "postTransaction") {
      transaction = action.transaction;
      rootId = transaction.id;
      requireGoal(
        !book.revisions.some((r) => r.rootId === rootId),
        "Giao dịch đã tồn tại.",
      );
      validateTransaction(transaction);
    } else {
      rootId = action.transactionId;
      reason = action.reason;
      transaction = action.replacement;
      const first = book.revisions.find(
        (r) => r.rootId === rootId,
      )?.transaction;
      requireGoal(
        first &&
          book.revisions.filter((r) => r.rootId === rootId).at(-1)?.transaction,
        "Giao dịch không tồn tại hoặc đã hủy.",
      );
      if (transaction) {
        requireGoal(
          transaction.id === rootId &&
            transaction.goalId === first.goalId &&
            transaction.toGoalId === first.toGoalId &&
            transaction.kind === first.kind,
          "Giữ loại và các mục tiêu của giao dịch gốc.",
        );
        validateTransaction(transaction, true);
      }
    }
    book.revisions.push({
      id: `${rootId}:${book.version + 1}`,
      rootId,
      sequence: book.version + 1,
      transaction,
      reason,
    });
  }
  allocations(book);
  balances(book);
  for (const g of book.goals.filter(
    (g) => g.mode === "ledger" && g.status === "archived",
  ))
    requireGoal(
      balances(book)[g.id] === "0",
      "Mục tiêu lưu trữ phải có số dư bằng 0.",
    );
  book.version++;
  book.audit.push({
    version: book.version,
    at: clock.now,
    today: clock.today,
    action: structuredClone(action),
    sources: structuredClone(snapshotSources),
  });
  return book;
}
export function validateGoalBook(raw: GoalBook) {
  const book = bookSchema.parse(raw);
  let rebuilt: GoalBook | null = null;
  for (const a of book.audit) {
    requireGoal(
      a.version === (rebuilt?.version ?? 0) + 1,
      "Lịch sử Mục tiêu không liên tục.",
    );
    rebuilt = applyAction(rebuilt, a.action, a.sources, {
      now: a.at,
      today: a.today,
    });
  }
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
        .join(",")}}`;
    return JSON.stringify(value);
  };
  const normalize = (b: GoalBook) => ({
    ...b,
    goals: [...b.goals].sort((a, b) => a.id.localeCompare(b.id)),
  });
  requireGoal(
    canonical(normalize(rebuilt ?? emptyBook())) === canonical(normalize(book)),
    "Dữ liệu Mục tiêu không khớp lịch sử.",
  );
}
