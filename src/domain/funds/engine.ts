import { ruleAt } from "../expenses/engine";
import type { Clock, ExpenseBook } from "../expenses/types";
import {
  actionSchema,
  fundIds,
  type FundAction,
  type FundId,
  type FundTransaction,
  type LivingExpenseSnapshot,
} from "./schema";
import type { FundBook, FundState, FundView, LivingSource } from "./types";
export class FundError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_FUND",
  ) {
    super(message);
  }
}
const fail = (message: string): never => {
  throw new FundError(message);
};
const bounded = (v: bigint) =>
  v >= 0n && v < 10n ** 24n
    ? v.toString()
    : fail("Số tiền ngoài giới hạn 24 chữ số.");
export function livingSource(
  expenses: ExpenseBook | null,
  month: string,
): LivingSource {
  return {
    expenseVersion: expenses?.version ?? 0,
    month,
    items: (expenses?.jars ?? [])
      .flatMap((jar) => {
        const rule = ruleAt(jar.rules, month);
        return jar.kind === "monthly" && jar.start <= month && rule?.active
          ? [{ jarId: jar.id, name: rule.name, amount: rule.amount }]
          : [];
      })
      .sort((a, b) => a.jarId.localeCompare(b.jarId)),
  };
}
export function selectLiving(
  source: LivingSource,
  ids: string[],
): LivingExpenseSnapshot {
  const items = ids.map(
    (id) =>
      source.items.find((i) => i.jarId === id) ??
      fail(
        "Hũ sinh hoạt đã ngừng hoạt động hoặc không còn phù hợp. Hãy chọn lại.",
      ),
  );
  if (!items.length) fail("Chọn ít nhất một hũ chi trong tháng.");
  const total = bounded(items.reduce((n, i) => n + BigInt(i.amount), 0n));
  if (total === "0") fail("Mức sinh hoạt phải lớn hơn 0.");
  return {
    expenseVersion: source.expenseVersion,
    month: source.month,
    items: [...items].sort((a, b) => a.jarId.localeCompare(b.jarId)),
    total,
  };
}
export function targetAmount(living: string, multiplier: string) {
  const [whole, fraction = ""] = multiplier.split(".");
  return bounded(
    (BigInt(living) * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) +
      99n) /
      100n,
  );
}
export function ratio(value: bigint, denominator: bigint, scale = 10000n) {
  if (denominator <= 0n) return "0.00";
  const scaled = (value * scale) / denominator;
  return `${scaled / 100n}.${String(scaled % 100n).padStart(2, "0")}`;
}
export const positionKey = (fund: FundId, location: string) =>
  `${fund}:${location}`;
export function activeTransactions(book: FundBook) {
  const latest = new Map<string, FundBook["revisions"][number]>();
  const first = new Map<string, number>();
  for (const r of [...book.revisions].sort((a, b) => a.sequence - b.sequence)) {
    if (!first.has(r.rootId)) first.set(r.rootId, r.sequence);
    latest.set(r.rootId, r);
  }
  return [...latest.values()]
    .flatMap((r) =>
      r.transaction
        ? [{ transaction: r.transaction, sequence: first.get(r.rootId)! }]
        : [],
    )
    .sort(
      (a, b) =>
        Date.parse(a.transaction.occurredAt) -
          Date.parse(b.transaction.occurredAt) || a.sequence - b.sequence,
    );
}
export function replay(book: FundBook | null): FundState {
  const balances: Record<string, string> = {};
  let contributed = 0n,
    withdrawn = 0n;
  const used = new Set<string>();
  if (book)
    for (const { transaction: t } of activeTransactions(book)) {
      const key = positionKey(t.fundId, t.locationId),
        amount = BigInt(t.amount);
      if (
        !book.funds.includes(t.fundId) ||
        !book.locations.some((l) => l.id === t.locationId)
      )
        fail("Quỹ hoặc nơi giữ tiền không tồn tại.");
      if (t.kind === "opening" && used.has(key))
        fail(
          "Số dư ban đầu phải là giao dịch đầu tiên của quỹ tại nơi giữ này.",
        );
      const current = BigInt(balances[key] ?? "0");
      if (t.kind === "withdraw" || t.kind === "transfer") {
        if (current < amount)
          fail(
            "Không đủ tiền tại thời điểm giao dịch. Kiểm tra cả các giao dịch sau đó.",
          );
        balances[key] = bounded(current - amount);
      } else balances[key] = bounded(current + amount);
      used.add(key);
      if (t.kind === "deposit") contributed += amount;
      if (t.kind === "withdraw") withdrawn += amount;
      if (t.kind === "transfer") {
        const to = positionKey(t.toFundId, t.toLocationId);
        if (key === to)
          fail("Nơi nhận phải khác nơi nguồn hoặc thuộc quỹ khác.");
        if (
          !book.funds.includes(t.toFundId) ||
          !book.locations.some((l) => l.id === t.toLocationId)
        )
          fail("Quỹ hoặc nơi nhận không tồn tại.");
        balances[to] = bounded(BigInt(balances[to] ?? "0") + amount);
        used.add(to);
      }
    }
  const config = book?.configurations.at(-1);
  const funds = fundIds.map((id) => {
    const balance = Object.entries(balances)
      .filter(([key]) => key.startsWith(id + ":"))
      .reduce((n, [, v]) => n + BigInt(v), 0n);
    const target = config
      ? BigInt(targetAmount(config.living.total, config.multipliers[id]))
      : 0n;
    return {
      id,
      balance: bounded(balance),
      target: target.toString(),
      missing: (target > balance ? target - balance : 0n).toString(),
      excess: (balance > target ? balance - target : 0n).toString(),
      percent: ratio(balance, target),
    };
  });
  return {
    balances,
    funds,
    total: funds.reduce((n, f) => n + BigInt(f.balance), 0n).toString(),
    target: funds.reduce((n, f) => n + BigInt(f.target), 0n).toString(),
    missing: funds.reduce((n, f) => n + BigInt(f.missing), 0n).toString(),
    emergencyMonths: ratio(
      BigInt(funds[0].balance),
      BigInt(config?.living.total ?? "0"),
      100n,
    ),
    contributed: contributed.toString(),
    withdrawn: withdrawn.toString(),
  };
}
export function toView(
  book: FundBook | null,
  source: LivingSource,
  clock: Clock,
): FundView {
  const living = book?.configurations.at(-1)?.living;
  let proposedLiving: LivingExpenseSnapshot | null = null;
  if (living) {
    try {
      proposedLiving = selectLiving(
        source,
        living.items.map((i) => i.jarId),
      );
    } catch {
      /* Explicitly expose missing/inactive sources. */
    }
  }
  const comparable = (s: LivingExpenseSnapshot) =>
    JSON.stringify({
      month: s.month,
      total: s.total,
      items: s.items.map((i) => [i.jarId, i.name, i.amount]),
    });
  return {
    book,
    state: replay(book),
    source,
    proposedLiving,
    sourceChanged: Boolean(
      living &&
      (!proposedLiving || comparable(living) !== comparable(proposedLiving)),
    ),
    sourceUnavailable: Boolean(living && !proposedLiving),
    now: clock.now,
  };
}
export function applyAction(
  input: FundBook | null,
  raw: FundAction,
  source: LivingSource,
  clock: Clock,
): FundBook {
  const action = actionSchema.parse(raw);
  if (!input && action.type !== "configure")
    fail("Thiết lập mức sinh hoạt và mục tiêu trước.");
  const book: FundBook = input
    ? structuredClone(input)
    : {
        version: 0,
        funds: [...fundIds],
        configurations: [],
        locations: [],
        revisions: [],
        audit: [],
      };
  const next = book.version + 1;
  if (action.type === "configure") {
    if (book.configurations.some((c) => c.id === action.id))
      fail("Mã cấu hình đã tồn tại.");
    let living = book.configurations.at(-1)?.living;
    if (action.applyLiving || !living) {
      if (
        action.expectedExpenseVersion !== source.expenseVersion ||
        action.sourceMonth !== source.month
      )
        throw new FundError(
          "Chi tiêu hoặc tháng nguồn đã đổi. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.",
          409,
          "EXPENSE_VERSION_CONFLICT",
        );
      living = selectLiving(source, action.jarIds);
    } else if (
      JSON.stringify([...action.jarIds].sort()) !==
      JSON.stringify(living.items.map((i) => i.jarId).sort())
    )
      fail("Chọn cập nhật mức sinh hoạt để thay đổi hũ nguồn.");
    for (const id of fundIds)
      targetAmount(living.total, action.multipliers[id]);
    book.configurations.push({
      id: action.id,
      sequence: next,
      at: clock.now,
      living: structuredClone(living),
      multipliers: structuredClone(action.multipliers),
      priority: [...action.priority],
    });
  } else if (action.type === "saveLocation") {
    const existing = book.locations.find((l) => l.id === action.id);
    if (!existing && !action.active) fail("Nơi giữ mới phải đang hoạt động.");
    if (
      book.locations.some(
        (l) =>
          l.id !== action.id &&
          l.name.toLocaleLowerCase() === action.name.toLocaleLowerCase(),
      )
    )
      fail("Tên nơi giữ đã tồn tại.");
    if (
      !action.active &&
      fundIds.some(
        (id) =>
          BigInt(replay(book).balances[positionKey(id, action.id)] ?? "0") !==
          0n,
      )
    )
      fail("Chỉ ngừng nơi giữ khi số dư của mọi quỹ bằng 0.");
    if (existing)
      Object.assign(existing, { name: action.name, active: action.active });
    else
      book.locations.push({
        id: action.id,
        name: action.name,
        active: action.active,
      });
  } else {
    let transaction: FundTransaction | null,
      rootId: string,
      reason = "";
    if (action.type === "postTransaction") {
      transaction = action.transaction;
      rootId = transaction.id;
      if (book.revisions.some((r) => r.rootId === rootId))
        fail("Giao dịch đã tồn tại.");
    } else {
      const previous = [...book.revisions]
        .reverse()
        .find((r) => r.rootId === action.transactionId);
      if (!previous?.transaction) fail("Giao dịch không tồn tại hoặc đã hủy.");
      transaction = action.replacement;
      rootId = action.transactionId;
      reason = action.reason;
      if (transaction && transaction.id !== rootId)
        fail("Không được thay mã giao dịch.");
    }
    if (transaction) {
      if (Date.parse(transaction.occurredAt) > Date.parse(clock.now))
        fail("Không ghi giao dịch trong tương lai.");
      const previous = [...book.revisions]
        .reverse()
        .find((r) => r.rootId === rootId)?.transaction;
      const endpoints = (t: FundTransaction) => [
        t.locationId,
        ...(t.kind === "transfer" ? [t.toLocationId] : []),
      ];
      for (const id of endpoints(transaction))
        if (
          !book.locations.some(
            (l) =>
              l.id === id &&
              (l.active || (previous && endpoints(previous).includes(id))),
          )
        )
          fail("Nơi giữ tiền không tồn tại hoặc đã ngừng sử dụng.");
    }
    book.revisions.push({
      id: `${rootId}:${next}`,
      rootId,
      sequence: next,
      transaction,
      reason,
    });
    replay(book);
    for (const l of book.locations.filter((l) => !l.active))
      if (
        fundIds.some(
          (id) =>
            BigInt(replay(book).balances[positionKey(id, l.id)] ?? "0") !== 0n,
        )
      )
        fail(
          "Thay đổi làm nơi giữ đã ngừng sử dụng có số dư. Khôi phục nơi giữ trước.",
        );
  }
  book.version = next;
  book.audit.push({
    version: next,
    at: clock.now,
    action: structuredClone(action),
  });
  return book;
}
