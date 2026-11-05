import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  applyAction,
  validateGoalBook,
  view,
} from "../../src/domain/goals/engine";
import {
  sourcesSchema,
  type GoalAction,
  type GoalBook,
  type GoalSources,
} from "../../src/domain/goals/schema";
import type { GoalRepository } from "../../src/application/goals";
import type { Clock } from "../../src/domain/shared/types";

export function reviewId(dataset: string, key: string) {
  const hex = createHash("sha256").update(`${dataset}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function orderedBook(book: GoalBook | null): GoalBook | null {
  return (
    book && {
      ...book,
      goals: [...book.goals].sort((a, b) => a.id.localeCompare(b.id)),
    }
  );
}

export function buildGoalReviewData(input: {
  ownerId: string;
  sources: GoalSources;
  clock: Clock;
  datasetId?: string;
}) {
  const ownerId = z.uuid().parse(input.ownerId),
    datasetId = z.uuid().parse(input.datasetId ?? randomUUID()),
    sources = sourcesSchema.parse(input.sources),
    clock = input.clock,
    actions: GoalAction[] = [],
    ids: Record<string, string> = {};
  let book: GoalBook | null = null;
  const push = (action: GoalAction) => {
    book = applyAction(book, action, sources, clock);
    actions.push(action);
  };
  const goal = (
    key: string,
    name: string,
    target: string,
    note: string,
    options: Partial<Extract<GoalAction, { type: "saveGoal" }>["goal"]> = {},
  ) => {
    const id = reviewId(datasetId, key);
    ids[key] = id;
    push({
      type: "saveGoal",
      goal: {
        id,
        name,
        target,
        note: `DỮ LIỆU MẪU UI/UX · ${datasetId}. ${note}`,
        purpose: "spending",
        mode: "ledger",
        basis: "capital",
        deadline: null,
        monthly: "0",
        links: [],
        ...options,
      },
    });
    return id;
  };
  const date = (days: number) =>
    new Date(Date.parse(clock.now) + days * 86400000)
      .toISOString()
      .slice(0, 10);
  const post = (
    key: string,
    goalId: string,
    amount: string,
    kind: "opening" | "deposit" | "withdraw" | "transfer" = "opening",
    daysAgo = 100,
    toGoalId: string | null = null,
  ) => {
    const transaction = {
      id: reviewId(datasetId, key),
      goalId,
      toGoalId,
      amount,
      kind,
      occurredAt: new Date(
        Date.parse(clock.now) - daysAgo * 86400000,
      ).toISOString(),
      note: `Mẫu review: ${kind === "transfer" ? "chuyển tiền còn lại sang mục tiêu mua xe" : kind === "withdraw" ? "sử dụng một phần tiền đã chuẩn bị" : "khoản tiền minh họa, không phải tài sản thực"}.`,
    };
    push({ type: "postTransaction", transaction });
    return transaction;
  };
  const status = (goalId: string, value: "paused" | "completed" | "archived") =>
    push({
      type: "setStatus",
      goalId,
      status: value,
      reason:
        "Mẫu review trạng thái và lịch sử; không thay đổi tiền ở module khác.",
    });
  const active = sources.items.filter((s) => s.active);
  const links = (kind: "funds" | "investments") =>
    active
      .filter((s) => s.kind === kind)
      .map((s) => ({
        kind: s.kind,
        sourceId: s.sourceId,
        ...(s.scope ? { scope: s.scope } : {}),
        share: 10000,
      }));
  for (const [key, name, target, kind] of [
    ["safety", "An toàn tài chính", "85000000", "funds"],
    ["investment", "Danh mục đầu tư 500 triệu", "500000000", "investments"],
  ] as const) {
    const selected = links(kind);
    if (selected.length)
      goal(
        key,
        name,
        target,
        "Mức đích tham khảo Notion/goal.png. Tiến độ lấy từ nguồn đang có, không sao chép số dư hoặc công thức phần trăm trong ảnh.",
        {
          mode: "linked",
          purpose: "milestone",
          basis: "value",
          monthly: kind === "investments" ? "5000000" : "2000000",
          deadline: date(365),
          links: selected,
        },
      );
  }
  if (links("investments").length)
    goal(
      "investment-capital",
      "Vốn đầu tư dài hạn",
      "500000000",
      "Case bổ sung: cùng nguồn Đầu tư nhưng theo giá vốn, để so với giá trị hiện tại hoặc định giá còn thiếu/cũ. Hai cột mốc không được cộng thành tổng tài sản.",
      {
        mode: "linked",
        purpose: "milestone",
        basis: "capital",
        links: links("investments"),
      },
    );
  const savings = active.find(
    (s) => s.kind === "savings" && BigInt(s.capital) > 0n,
  );
  if (savings) {
    for (const [key, name, share, target] of [
      ["home", "Góc làm việc tại nhà", 6000, "30000000"],
      ["family", "Chuyến đi cùng gia đình", 4000, "20000000"],
    ] as const)
      goal(
        key,
        name,
        target,
        `Case tự tạo: chia ${share / 100}% cùng một nguồn Tiết kiệm; chỉ theo dõi, không khóa hoặc chuyển tiền.`,
        {
          mode: "linked",
          monthly: "1500000",
          deadline: date(180),
          links: [{ kind: "savings", sourceId: savings.sourceId, share }],
        },
      );
    status(ids.family, "paused");
  }
  const car = goal(
    "car",
    "Mua xe đi làm",
    "100000000",
    "Case tự tạo: tiến độ 40%, hơn 20 giao dịch để review tìm kiếm/lọc/phân trang; có số dư đầu, góp, sửa, hủy và nhận chuyển.",
    { deadline: date(365), monthly: "5000000" },
  );
  post("car-opening", car, "10000000", "opening", 120);
  let revised;
  for (let i = 0; i < 24; i++) {
    const t = post(`car-deposit-${i}`, car, "1000000", "deposit", 100 - i * 3);
    if (i === 0) revised = t;
  }
  push({
    type: "reviseTransaction",
    transactionId: revised!.id,
    replacement: { ...revised!, amount: "2000000" },
    reason:
      "Mẫu review: sửa khoản góp từ 1 triệu thành 2 triệu, giữ lịch sử gốc.",
  });
  const canceled = post("car-duplicate", car, "2000000", "deposit", 20);
  push({
    type: "reviseTransaction",
    transactionId: canceled.id,
    replacement: null,
    reason: "Mẫu review: hủy khoản góp bị ghi trùng.",
  });
  const tuition = goal(
    "tuition",
    "Học phí cho Thủy",
    "8000000",
    "Tên tham khảo dòng tiền học cho Thủy trong Notion/goal.png; số đích và lịch sử tự tạo. Đủ 100%, đang chờ bạn xác nhận hoàn thành.",
    { deadline: date(30), monthly: "2000000" },
  );
  post("tuition-opening", tuition, "6000000");
  post("tuition-deposit", tuition, "2000000", "deposit", 10);
  const holiday = goal(
    "holiday",
    "Tết cùng gia đình",
    "12000000",
    "Case tự tạo: vượt đích 112,5%; thanh tiến độ vẫn giới hạn 100%.",
    { deadline: date(90), monthly: "1000000" },
  );
  post("holiday-opening", holiday, "10000000");
  post("holiday-deposit", holiday, "3500000", "deposit", 10);
  const overdue = goal(
    "laptop",
    "Đổi laptop phục vụ công việc",
    "20000000",
    "Case tự tạo: đã qua hạn, mới chuẩn bị 30%; cần điều chỉnh kế hoạch.",
    { deadline: date(-10), monthly: "1000000" },
  );
  post("laptop-opening", overdue, "6000000");
  const paused = goal(
    "study",
    "Khóa học nâng cao chuyên môn",
    "15000000",
    "Case tự tạo: tạm dừng ở 20%, giữ số dư và ngừng ước tính tháng đạt.",
    { deadline: date(180), monthly: "1500000" },
  );
  post("study-opening", paused, "3000000");
  status(paused, "paused");
  const completed = goal(
    "health",
    "Khám sức khỏe cho gia đình",
    "5000000",
    "Case tự tạo: đã hoàn thành ở 5 triệu, sau đó rút 3 triệu; số dư còn 2 triệu và mốc hoàn thành giữ nguyên.",
  );
  post("health-opening", completed, "5000000");
  status(completed, "completed");
  post("health-withdraw", completed, "3000000", "withdraw", 5);
  const archived = goal(
    "phone",
    "Điện thoại mới — đã khép lại",
    "9000000",
    "Case tự tạo: rút 4 triệu, chuyển 5 triệu sang Mua xe rồi lưu trữ ở số dư 0; có lịch sử để đối chiếu.",
  );
  post("phone-opening", archived, "9000000");
  post("phone-withdraw", archived, "4000000", "withdraw", 5);
  post("phone-transfer", archived, "5000000", "transfer", 4, car);
  status(archived, "archived");
  goal(
    "studio",
    "Không gian sống mới",
    "80000000",
    "Case tự tạo: chưa góp tiền, chưa đặt hạn và chưa chọn mức góp mỗi tháng.",
  );
  const result = view(orderedBook(book), sources, clock);
  validateGoalBook(result.book!);
  return {
    format: "financial-manager-goals-review" as const,
    ownerId,
    datasetId,
    clock,
    references: ["Notion/goal.png"],
    sources,
    ids,
    actions,
    expected: result,
  };
}

export type GoalReviewData = ReturnType<typeof buildGoalReviewData>;

export async function applyGoalReviewData(
  repository: GoalRepository,
  data: GoalReviewData,
  today: string,
) {
  // Validate the complete package before opening a write transaction.
  z.uuid().parse(data.ownerId);
  z.uuid().parse(data.datasetId);
  if (data.format !== "financial-manager-goals-review")
    throw new Error("INVALID_GOAL_REVIEW_PACKAGE");
  let expected: GoalBook | null = null;
  for (const action of data.actions)
    expected = applyAction(expected, action, data.sources, data.clock);
  if (!isDeepStrictEqual(orderedBook(expected), data.expected.book))
    throw new Error("GOAL_REVIEW_PACKAGE_CHANGED");
  return repository.transaction(data.ownerId, async (tx) => {
    const before = await tx.read();
    if (before) {
      const marker = before.audit.find((a) => a.action.type === "saveGoal");
      if (
        marker?.action.type === "saveGoal" &&
        data.actions[0]?.type === "saveGoal" &&
        marker.action.goal.id === data.actions[0].goal.id &&
        marker.action.goal.note.includes(data.datasetId)
      )
        return { installed: true, version: before.version };
      throw new Error("GOALS_NOT_EMPTY: giữ dữ liệu đang có, chưa ghi.");
    }
    const sources = await tx.sources(today);
    if (today !== data.clock.today || !isDeepStrictEqual(sources, data.sources))
      throw new Error("GOAL_SOURCES_CHANGED: tạo lại package trước khi nạp.");
    let book: GoalBook | null = null;
    for (const action of data.actions) {
      book = applyAction(book, action, sources, data.clock);
      await tx.save(book);
    }
    if (
      !isDeepStrictEqual(
        view(await tx.read(), sources, data.clock),
        data.expected,
      )
    )
      throw new Error("GOAL_REVIEW_READ_BACK_FAILED");
    return { installed: false, version: book!.version };
  });
}
