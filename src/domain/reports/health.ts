import { materialize, monthRange } from "../expenses/engine";
import type { ExpenseRow } from "../expenses/types";
import { ratio } from "../funds/engine";
import type { goalState } from "../goals/engine";
import type { Goal } from "../goals/schema";
import { toView as incomeView } from "../income/engine";
import { buildReport as incomeReport } from "../income/reports";
import { previousDate } from "../savings/engine";
import { sumMoney } from "../shared/money";
import type { Clock } from "../shared/types";
import {
  changePercent,
  percentText,
  type AssetKind,
  type Assets,
  type AssetSourceId,
  type Books,
  type Cell,
  type Fact,
  type Indicator,
  type Overview,
  type Period,
  type Rating,
  type SourceId,
} from "./model";

/** A ledger on one date. `recorded` means something was posted on or before it. */
export interface Holding {
  recorded: boolean;
  value: Cell;
  stale: boolean;
}
export interface Snapshots {
  savings?: {
    closing: Holding;
    opening: Holding;
    kinds: Record<"cash" | "deposit" | "gold", Cell>;
  };
  investments?: { closing: Holding; opening: Holding };
  funds?: {
    closing: Holding;
    opening: Holding;
    linked: string;
    openingLinked: string;
    emergency: {
      /** Something was posted or linked to the emergency fund itself. */
      recorded: boolean;
      balance: string;
      living: string | null;
      month: string | null;
    };
  };
  goals?: { goal: Goal; state: ReturnType<typeof goalState> }[];
}

/** Every sentence this module can return; each one needs an English entry. */
export const TEXT = {
  rating: {
    good: "Tốt",
    attention: "Cần chú ý",
    improve: "Cần cải thiện",
    insufficient: "Chưa đủ dữ liệu",
  },
  sourceError: "Lỗi tải nguồn",
  asset: {
    kinds: {
      cash: "Tiền mặt tiết kiệm",
      deposit: "Tiền gửi",
      gold: "Vàng",
      investments: "Đầu tư",
      funds: "Quỹ an toàn ngoài phần liên kết",
    },
    error: {
      savings: "Chưa đọc được Tiết kiệm.",
      investments: "Chưa đọc được Đầu tư.",
      funds: "Chưa đọc được Quỹ an toàn.",
    },
    missing: {
      savings: "Tiết kiệm thiếu định giá.",
      investments: "Đầu tư thiếu định giá.",
      funds: "Quỹ an toàn thiếu dữ liệu.",
    },
    nothing: "Chưa ghi tài sản nào đến ngày này.",
    unrecorded: {
      savings: "Tiết kiệm chưa ghi giao dịch nên tính 0.",
      investments: "Đầu tư chưa ghi giao dịch nên tính 0.",
      funds: "Quỹ an toàn chưa ghi số dư nên tính 0.",
    },
    noOpening: "Đầu kỳ chưa ghi tài sản nên chưa so sánh.",
    startedInPeriod: "Có sổ bắt đầu ghi trong kỳ nên chưa so sánh.",
    openingMissing: "Thiếu dữ liệu đầu kỳ nên chưa so sánh.",
  },
  excluded: {
    noIncome: "Chưa ghi thu nhập",
    missingIncome: "Còn khoản thu chưa nhập",
    noJars: "Chưa có hũ chi",
    unfunded: "Có hũ chưa bỏ tiền",
    noSpending: "Chưa ghi khoản chi nào",
    unconfirmed: "Chưa nhập số dư cuối của hũ",
  },
  emergency: {
    label: "Quỹ dự phòng",
    value: "Chi sinh hoạt được trang trải",
    balance: "Số dư quỹ khẩn cấp",
    living: "Chi sinh hoạt mỗi tháng",
    month: "Mức sinh hoạt xác nhận cho tháng",
    formula:
      "Số dư quỹ khẩn cấp chia chi sinh hoạt mỗi tháng. Tốt từ 6 tháng; cần chú ý từ 3 đến dưới 6; cần cải thiện dưới 3.",
    noConfig: "Chưa xác nhận mức sinh hoạt trong Quỹ an toàn.",
    noBalance: "Quỹ khẩn cấp chưa ghi số dư.",
    good: "Duy trì mức này và rà lại khi chi sinh hoạt thay đổi.",
    attention: "Tiếp tục góp để đạt ít nhất 6 tháng chi sinh hoạt.",
    improve: "Ưu tiên góp để có ít nhất 3 tháng chi sinh hoạt.",
    insufficient: "Thiết lập mức sinh hoạt và số dư trong Quỹ an toàn.",
  },
  savingsRate: {
    label: "Tỷ lệ để dành",
    value: "Phần thu nhập còn lại",
    income: "Thu nhập được tính",
    spent: "Chi tiêu được tính",
    left: "Còn lại",
    unconfirmed: "Lượt hũ chưa nhập số dư cuối (tính là đã chi hết)",
    formula:
      "Thu trừ chi, chia cho thu, của các tháng đã kết thúc và đủ dữ liệu. Tốt từ 20%; cần chú ý từ 0 đến dưới 20%; cần cải thiện khi âm.",
    noMonth: "Chưa có tháng đủ dữ liệu thu và chi.",
    zeroIncome: "Thu nhập của các tháng được tính bằng 0.",
    good: "Giữ nhịp để dành hiện tại.",
    attention: "Xem lại các khoản chi lớn để tăng phần để dành.",
    improve:
      "Chi đang cao hơn thu đã ghi nhận; rà lại chi tiêu hoặc khoản thu còn thiếu.",
    insufficient:
      "Ghi đủ thu nhập và số dư cuối của hũ cho các tháng đã kết thúc.",
  },
  budget: {
    label: "Giữ ngân sách",
    value: "Số hũ vượt mức",
    jarMonths: "Lượt hũ vượt mức",
    over: "Số tiền vượt",
    target: "Ngân sách được tính",
    unconfirmed: "Lượt hũ chưa nhập số dư cuối (không tính)",
    formula:
      "So số chi với ngân sách của các hũ chi trong tháng đã nhập số dư cuối. Tốt khi không hũ nào vượt; cần chú ý khi tổng vượt tối đa 5% ngân sách; cần cải thiện khi vượt hơn.",
    noMonth: "Chưa có hũ nào nhập số dư cuối ở tháng được tính.",
    good: "Tiếp tục ghi số dư cuối của từng hũ để theo dõi.",
    attention: "Xem lại các hũ vượt mức.",
    improve: "Điều chỉnh ngân sách hoặc giảm chi ở các hũ vượt mức.",
    insufficient: "Nhập số dư cuối của hũ chi cho các tháng đã kết thúc.",
  },
  goals: {
    label: "Tiến độ mục tiêu",
    value: "Mục tiêu đúng kế hoạch",
    active: "Mục tiêu đang thực hiện",
    overdue: "Quá hạn",
    behind: "Kế hoạch góp thấp hơn mức cần",
    noDeadline: "Chưa đặt hạn",
    unknown: "Không đọc được nguồn",
    paused: "Tạm dừng (không tính)",
    formula:
      "So mức góp dự kiến hằng tháng với mức cần để kịp hạn, theo hôm nay. Cần cải thiện khi có mục tiêu quá hạn; cần chú ý khi có mục tiêu chậm kế hoạch.",
    none: "Chưa có mục tiêu đang thực hiện.",
    unreadable: "Có mục tiêu không đọc được nguồn.",
    undated: "Mục tiêu đang thực hiện chưa đặt hạn.",
    good: "Duy trì mức góp hiện tại.",
    attention: "Tăng mức góp hằng tháng hoặc lùi hạn cho mục tiêu đang chậm.",
    improve: "Cập nhật hạn hoặc mức góp cho mục tiêu quá hạn.",
    insufficient: "Đặt hạn và mức góp trong Mục tiêu.",
  },
} as const;

const assetSources: AssetSourceId[] = ["savings", "investments", "funds"];
type Ready = (source: SourceId) => boolean;

function assets(snapshots: Snapshots, ready: Ready, period: Period): Assets {
  const closingLinked = snapshots.funds?.linked ?? "0",
    openingLinked = snapshots.funds?.openingLinked ?? "0";
  const side = (when: "closing" | "opening") =>
    assetSources.map((id) => {
      const holding = ready(id) ? snapshots[id]?.[when] : undefined;
      if (!holding) return { id, state: "error" as const, stale: false };
      const state = !holding.recorded
        ? ("unrecorded" as const)
        : holding.value === null
          ? ("missing" as const)
          : ("recorded" as const);
      // What this ledger adds to the total: fund money that follows Savings is counted there.
      const net =
        state === "unrecorded"
          ? "0"
          : holding.value === null
            ? null
            : id === "funds"
              ? (
                  BigInt(holding.value) -
                  BigInt(when === "closing" ? closingLinked : openingLinked)
                ).toString()
              : holding.value;
      return { id, state, stale: holding.stale, net };
    });
  const closing = side("closing"),
    opening = side("opening");
  const totalOf = (rows: ReturnType<typeof side>) =>
    rows.every((r) => r.state === "unrecorded") ||
    rows.some((r) => r.net === null || r.net === undefined)
      ? null
      : sumMoney(rows.map((r) => r.net!));
  const total = totalOf(closing),
    before = totalOf(opening);
  const reasons: string[] = closing.flatMap((r) =>
    r.state === "error"
      ? [TEXT.asset.error[r.id]]
      : r.state === "missing"
        ? [TEXT.asset.missing[r.id]]
        : [],
  );
  if (closing.every((r) => r.state === "unrecorded"))
    reasons.push(TEXT.asset.nothing);
  // A ledger that only started during the period would look like growth.
  const started = closing.some(
    (r, i) => opening[i].state === "unrecorded" && r.net && r.net !== "0",
  );
  const changeReason =
    total === null
      ? null
      : opening.every((r) => r.state === "unrecorded")
        ? TEXT.asset.noOpening
        : before === null
          ? TEXT.asset.openingMissing
          : started
            ? TEXT.asset.startedInPeriod
            : null;
  const comparable = total !== null && changeReason === null ? before : null;
  const part = (id: AssetSourceId) => closing.find((r) => r.id === id)!;
  const empty = closing.every((r) => r.state === "unrecorded");
  const kind = (id: "cash" | "deposit" | "gold"): Cell =>
    part("savings").state === "error"
      ? null
      : (snapshots.savings?.kinds[id] ?? null);
  const values: Record<AssetKind, Cell> = {
    cash: kind("cash"),
    deposit: kind("deposit"),
    gold: kind("gold"),
    investments: part("investments").net ?? null,
    funds: part("funds").net ?? null,
  };
  return {
    asOf: period.asOf,
    openingDate: previousDate(period.from),
    total,
    opening: comparable,
    delta:
      comparable === null
        ? null
        : (BigInt(total!) - BigInt(comparable)).toString(),
    percent: changePercent(total, comparable),
    linked: part("funds").state === "error" ? null : closingLinked,
    sources: closing.map(({ id, state, stale }) => ({ id, state, stale })),
    notes:
      total === null
        ? []
        : closing
            .filter((r) => r.state === "unrecorded")
            .map((r) => TEXT.asset.unrecorded[r.id]),
    composition: (Object.keys(values) as AssetKind[]).map((id) => ({
      id,
      label: TEXT.asset.kinds[id],
      // With nothing recorded at all, a row of zeros would look like data.
      value: empty ? null : values[id],
      share:
        total === null || total === "0" || values[id] === null
          ? null
          : percentText((BigInt(values[id]!) * 10000n) / BigInt(total)),
    })),
    reasons,
    changeReason,
    openingStale: comparable !== null && opening.some((r) => r.stale),
  };
}

type Verdict = Pick<Indicator, "rating" | "reason" | "suggestion">;
function verdict(
  text: Record<Rating, string>,
  rating: Rating,
  reason: string | null = null,
): Verdict {
  return { rating, reason, suggestion: text[rating] };
}
const fact = (label: string, type: Fact["type"], value: Cell): Fact => ({
  label,
  type,
  value,
});
function indicator(
  id: Indicator["id"],
  text: { label: string; formula: string },
  result: Verdict & Partial<Pick<Indicator, "value" | "facts" | "months">>,
  fallback = false,
): Indicator {
  return {
    id,
    label: text.label,
    formula: text.formula,
    value: null,
    facts: [],
    months: [],
    fallback,
    ...result,
  };
}

function emergency(snapshots: Snapshots, ready: Ready): Indicator {
  const text = TEXT.emergency;
  const funds = ready("funds") ? snapshots.funds : undefined;
  const none = (reason: string) =>
    indicator("emergency", text, verdict(text, "insufficient", reason));
  if (!funds) return none(TEXT.sourceError);
  const { recorded, balance, living, month } = funds.emergency;
  if (living === null || BigInt(living) <= 0n) return none(text.noConfig);
  if (!recorded) return none(text.noBalance);
  const held = BigInt(balance),
    monthly = BigInt(living);
  return indicator("emergency", text, {
    ...verdict(
      text,
      held >= 6n * monthly
        ? "good"
        : held >= 3n * monthly
          ? "attention"
          : "improve",
    ),
    value: fact(text.value, "months", ratio(held, monthly, 100n)),
    facts: [
      fact(text.balance, "money", balance),
      fact(text.living, "money", living),
      fact(text.month, "month", month),
    ],
  });
}

/** Completed months of the period, or the latest completed month when it has none yet. */
export function completedMonths(period: Period, clock: Clock) {
  const current = clock.today.slice(0, 7);
  const months = monthRange(
    period.from.slice(0, 7),
    period.to.slice(0, 7),
  ).filter((m) => m < current);
  if (months.length) return { months, fallback: false };
  const latest = previousDate(`${current}-01`).slice(0, 7);
  return { months: latest >= "2000-01" ? [latest] : [], fallback: true };
}

const unfunded = (rows: ExpenseRow[]) =>
  rows.some((r) => r.kind === "monthly" && r.active && r.funded === false);

function monthly(
  books: Partial<Books>,
  ready: Ready,
  period: Period,
  clock: Clock,
): Indicator[] {
  const { months, fallback } = completedMonths(period, clock);
  const rate = TEXT.savingsRate,
    budget = TEXT.budget;
  const fail = (
    id: "savingsRate" | "budget",
    text: typeof rate | typeof budget,
  ) =>
    indicator(
      id,
      text,
      verdict(text, "insufficient", TEXT.sourceError),
      fallback,
    );
  if (!ready("expenses"))
    return [fail("savingsRate", rate), fail("budget", budget)];
  const rows = books.expenses ? materialize(books.expenses, clock) : [];
  const confirmed = new Set(
    (books.expenses?.inputs ?? [])
      .filter((i) => i.closing !== null)
      .map((i) => `${i.jarId}/${i.month}`),
  );
  const byMonth = months.map((month) => {
    const all = rows.filter((r) => r.month === month && r.status !== "planned");
    const jars = all.filter((r) => r.kind === "monthly" && r.active);
    return {
      month,
      all,
      jars,
      checked: jars.filter((r) => confirmed.has(`${r.jarId}/${month}`)),
    };
  });

  const savingsRate = (): Indicator => {
    if (!ready("income")) return fail("savingsRate", rate);
    const years = new Map(
      [...new Set(months.map((m) => Number(m.slice(0, 4))))].map((year) => [
        year,
        incomeReport(incomeView(books.income ?? null, year, clock), {
          year,
          from: 1,
          to: 12,
          kind: "all",
        }).months,
      ]),
    );
    const checked = byMonth.map((m) => {
      const income = years
        .get(Number(m.month.slice(0, 4)))!
        .find((v) => v.month === m.month)!;
      const spent = sumMoney(m.all.map((r) => r.spent));
      const excluded: string | null =
        income.total === null
          ? TEXT.excluded.noIncome
          : income.missing
            ? TEXT.excluded.missingIncome
            : !m.all.length
              ? TEXT.excluded.noJars
              : unfunded(m.all)
                ? TEXT.excluded.unfunded
                : spent === "0"
                  ? TEXT.excluded.noSpending
                  : null;
      return { ...m, excluded, income: income.total ?? "0", spent };
    });
    const used = checked.filter((m) => !m.excluded);
    const earned = BigInt(sumMoney(used.map((m) => m.income))),
      spent = BigInt(sumMoney(used.map((m) => m.spent)));
    const list = checked.map(({ month, excluded }) => ({ month, excluded }));
    if (!used.length || earned <= 0n)
      return indicator(
        "savingsRate",
        rate,
        {
          ...verdict(
            rate,
            "insufficient",
            used.length ? rate.zeroIncome : rate.noMonth,
          ),
          months: list,
        },
        fallback,
      );
    const left = earned - spent;
    const assumed = used.reduce(
      (n, m) => n + (m.jars.length - m.checked.length),
      0,
    );
    return indicator(
      "savingsRate",
      rate,
      {
        ...verdict(
          rate,
          left * 5n >= earned ? "good" : left >= 0n ? "attention" : "improve",
        ),
        value: fact(
          rate.value,
          "percent",
          percentText((left * 10000n) / earned),
        ),
        facts: [
          fact(rate.income, "money", earned.toString()),
          fact(rate.spent, "money", spent.toString()),
          fact(rate.left, "money", left.toString()),
          ...(assumed
            ? [fact(rate.unconfirmed, "count", String(assumed))]
            : []),
        ],
        months: list,
      },
      fallback,
    );
  };

  const budgetCheck = (): Indicator => {
    const checked = byMonth.map((m) => ({
      ...m,
      excluded: !m.jars.length
        ? TEXT.excluded.noJars
        : unfunded(m.all)
          ? TEXT.excluded.unfunded
          : !m.checked.length
            ? TEXT.excluded.unconfirmed
            : null,
    }));
    const used = checked.filter((m) => !m.excluded);
    const list = checked.map(({ month, excluded }) => ({
      month,
      excluded: excluded as string | null,
    }));
    if (!used.length)
      return indicator(
        "budget",
        budget,
        { ...verdict(budget, "insufficient", budget.noMonth), months: list },
        fallback,
      );
    const entries = used.flatMap((m) => m.checked);
    const exceeded = entries.filter((r) => r.over !== "0");
    // One jar's surplus never cancels another jar's overrun.
    const over = BigInt(sumMoney(exceeded.map((r) => r.over))),
      target = BigInt(sumMoney(entries.map((r) => r.target)));
    const skipped = used.reduce(
      (n, m) => n + (m.jars.length - m.checked.length),
      0,
    );
    return indicator(
      "budget",
      budget,
      {
        ...verdict(
          budget,
          over === 0n ? "good" : over * 20n <= target ? "attention" : "improve",
        ),
        value: fact(
          budget.value,
          "count",
          String(new Set(exceeded.map((r) => r.jarId)).size),
        ),
        facts: [
          fact(budget.jarMonths, "count", String(exceeded.length)),
          fact(budget.over, "money", over.toString()),
          fact(budget.target, "money", target.toString()),
          ...(skipped
            ? [fact(budget.unconfirmed, "count", String(skipped))]
            : []),
        ],
        months: list,
      },
      fallback,
    );
  };
  return [savingsRate(), budgetCheck()];
}

function goals(snapshots: Snapshots, ready: Ready): Indicator {
  const text = TEXT.goals;
  const list = ready("goals") ? snapshots.goals : undefined;
  if (!list)
    return indicator(
      "goals",
      text,
      verdict(text, "insufficient", TEXT.sourceError),
    );
  const count = {
    onTrack: 0,
    overdue: 0,
    behind: 0,
    noDeadline: 0,
    unknown: 0,
  };
  const active = list.filter((g) => g.goal.status === "active");
  for (const { goal, state } of active)
    count[
      // A goal whose source cannot be read is unknown, never overdue.
      state.current === null
        ? "unknown"
        : state.remaining === "0"
          ? "onTrack"
          : state.overdue
            ? "overdue"
            : state.requiredMonthly === null
              ? "noDeadline"
              : BigInt(goal.monthly) >= BigInt(state.requiredMonthly)
                ? "onTrack"
                : "behind"
    ]++;
  const rating: Rating = count.overdue
    ? "improve"
    : count.behind
      ? "attention"
      : count.unknown
        ? "insufficient"
        : count.onTrack
          ? "good"
          : "insufficient";
  const reason =
    rating !== "insufficient"
      ? null
      : !active.length
        ? text.none
        : count.unknown
          ? text.unreadable
          : text.undated;
  const paused = list.filter((g) => g.goal.status === "paused").length;
  const counted = (label: string, value: number) =>
    value ? [fact(label, "count", String(value))] : [];
  return indicator("goals", text, {
    ...verdict(text, rating, reason),
    // "0 on plan" would be a claim when no goal could be assessed.
    value:
      active.length && (rating !== "insufficient" || count.onTrack)
        ? fact(text.value, "count", String(count.onTrack))
        : null,
    facts: [
      ...counted(text.active, active.length),
      ...counted(text.overdue, count.overdue),
      ...counted(text.behind, count.behind),
      ...counted(text.noDeadline, count.noDeadline),
      ...counted(text.unknown, count.unknown),
      ...counted(text.paused, paused),
    ],
  });
}

export function buildOverview(
  books: Partial<Books>,
  snapshots: Snapshots,
  ready: Ready,
  period: Period,
  clock: Clock,
): Overview {
  return {
    assets: assets(snapshots, ready, period),
    indicators: [
      emergency(snapshots, ready),
      ...monthly(books, ready, period, clock),
      goals(snapshots, ready),
    ],
  };
}
