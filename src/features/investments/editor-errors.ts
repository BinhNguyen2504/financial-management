import { fieldErrorsFromIssues } from "@/lib/field-errors";

/** Turn schema diagnostics into short instructions for the investment editor. */
export function investmentFieldErrors(
  issues: Parameters<typeof fieldErrorsFromIssues>[0],
  fields: Record<string, string>,
) {
  const errors = fieldErrorsFromIssues(issues);
  for (const key of Object.keys(errors)) {
    if (["amount", "cost", "value", "fee", "tax"].includes(key)) {
      if (!fields[key]?.trim())
        errors[key] =
          key === "fee"
            ? "Nhập phí bằng số tiền VND nguyên; nhập 0 nếu không có phí."
            : key === "tax"
              ? "Nhập thuế bằng số tiền VND nguyên; nhập 0 nếu không có thuế."
              : "Nhập số tiền bằng VND.";
      else if (errors[key].startsWith("Nhập số tiền VND nguyên"))
        errors[key] = "Nhập số nguyên VND không âm, tối đa 24 chữ số.";
    }
  }
  if (
    errors.cashCategoryId &&
    fields.transactionKind === "transfer" &&
    !fields.cashCategoryId
  )
    errors.cashCategoryId = "Chọn ví nhận";
  return errors;
}
