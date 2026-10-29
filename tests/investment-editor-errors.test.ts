import { describe, expect, it } from "vitest";
import { actionSchema } from "../src/domain/investments/schema";
import { investmentFieldErrors } from "../src/features/investments/editor-errors";

const id = "10000000-0000-4000-8000-000000000001";
function errors(fields: Record<string, string>, kind = "buy") {
  const parsed = actionSchema.safeParse({
    type: "postTransaction",
    transaction: {
      id,
      kind,
      date: "2026-10-29",
      fee: "0",
      tax: "0",
      ...fields,
    },
  });
  expect(parsed.success).toBe(false);
  if (parsed.success) throw new Error("Expected invalid form");
  return investmentFieldErrors(parsed.error.issues, fields);
}

describe("investment editor validation feedback", () => {
  it("gives field instructions for empty IDs and money without schema diagnostics", () => {
    const result = errors({ categoryId: "", amount: "", value: "" });
    expect(result).toEqual({
      categoryId: "Chọn một danh mục có sẵn.",
      amount: "Nhập số tiền bằng VND.",
      value: "Nhập số tiền bằng VND.",
    });
    expect(JSON.stringify(result)).not.toMatch(/uuid|pattern|invalid_format/i);
  });
  it("keeps the positive amount rule and shortens invalid money guidance", () => {
    expect(errors({ categoryId: id, amount: "0", value: "0" }).amount).toBe(
      "Số tiền phải lớn hơn 0.",
    );
    expect(
      errors({ categoryId: id, amount: "1", value: "9".repeat(25) }).value,
    ).toBe("Nhập số nguyên VND không âm, tối đa 24 chữ số.");
  });
  it("accepts 24 digit values and zero valuation without changing the financial schema", () => {
    expect(
      actionSchema.safeParse({
        type: "postTransaction",
        transaction: {
          id,
          kind: "buy",
          date: "2026-10-29",
          categoryId: id,
          amount: "9".repeat(24),
          value: "0",
        },
      }).success,
    ).toBe(true);
  });
  it("explains a missing transfer destination and revision reason", () => {
    const parsed = actionSchema.safeParse({
      type: "reviseTransaction",
      transactionId: id,
      reason: "",
      replacement: {
        id,
        kind: "transfer",
        date: "2026-10-29",
        categoryId: id,
        cashCategoryId: "",
        amount: "1",
      },
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Expected invalid form");
    expect(investmentFieldErrors(parsed.error.issues, {})).toMatchObject({
      cashCategoryId: "Chọn ví tiền phù hợp hoặc để trống nếu không bắt buộc.",
      reason: "Nhập lý do thay đổi để giữ lịch sử rõ ràng.",
    });
  });
});
