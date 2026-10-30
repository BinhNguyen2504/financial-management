import type { Goal, GoalAction } from "@/domain/goals/schema";
export const statusNames = {
  active: "Đang theo đuổi",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  archived: "Lưu trữ",
};
export const kindNames = {
  opening: "Số dư ban đầu",
  deposit: "Góp tiền",
  withdraw: "Rút tiền",
  transfer: "Chuyển tiền",
};
export const purposeNames = {
  spending: "Chi dùng / cuộc sống",
  milestone: "Cột mốc tài chính",
};
export const sourceNames = {
  savings: "Tiết kiệm",
  investments: "Đầu tư",
  funds: "Quỹ an toàn",
};
export function newGoal(): GoalAction {
  return {
    type: "saveGoal",
    goal: {
      id: crypto.randomUUID(),
      name: "",
      note: "",
      purpose: "spending",
      mode: "ledger",
      basis: "value",
      target: "",
      deadline: null,
      monthly: "0",
      links: [],
    },
  };
}
export function editGoal(goal: Goal): GoalAction {
  const {
    status: _status,
    rank: _rank,
    completion: _completion,
    ...input
  } = goal;
  return { type: "saveGoal", goal: input };
}
export function postGoal(goalId: string, active = true): GoalAction {
  return {
    type: "postTransaction",
    transaction: {
      id: crypto.randomUUID(),
      goalId,
      kind: active ? "deposit" : "withdraw",
      toGoalId: null,
      amount: "",
      occurredAt: new Date().toISOString(),
      note: "",
    },
  };
}
