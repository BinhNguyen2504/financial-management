import type {
  CategoryPosition,
  SavingsTransaction,
  TransactionEffect,
} from "@/domain/savings/types";

/** A label and exact amount relative to the selected asset, not the portfolio flow. */
export function savingsImpact(
  t: SavingsTransaction,
  effect: TransactionEffect | undefined,
  position: Pick<CategoryPosition, "id" | "kind">,
) {
  if (!effect) return { label: "Không còn hiệu lực", amount: null };
  if (position.kind === "gold")
    return {
      label:
        t.kind === "sellGold"
          ? "Tiền bán sau phí / thuế"
          : t.kind === "openingGold"
            ? "Giá vốn mở đầu"
            : "Giá vốn gồm phí / thuế",
      amount: t.kind === "openingGold" ? t.amount : effect.net,
      quantity: `${t.kind === "sellGold" ? "−" : "+"}${effect.quantity}`,
    };
  if (position.kind === "deposit") {
    if (t.kind === "rollover")
      return { label: "Lãi nhập vào sổ tái tục", amount: t.reinvestInterest };
    if (t.kind === "interest")
      return {
        label: t.capitalize ? "Lãi nhập gốc" : "Lãi trả ra ngoài sổ",
        amount: t.amount,
      };
    if (t.kind === "withdrawDeposit")
      return { label: "Gốc rút khỏi sổ", amount: `-${t.amount}` };
    return { label: "Gốc gửi vào sổ", amount: "amount" in t ? t.amount : null };
  }
  let amount: bigint;
  if (position.id !== t.categoryId) {
    amount =
      BigInt(effect.net) *
      (t.kind === "buyGold" || t.kind === "openDeposit" ? -1n : 1n);
  } else if (t.kind === "withdraw" || t.kind === "transfer") {
    amount = -(BigInt(t.amount) + BigInt(effect.fees));
  } else if (t.kind === "fee") amount = -BigInt(t.amount);
  else amount = BigInt("amount" in t ? t.amount : "0");
  return {
    label: amount < 0n ? "Tiền ra khỏi ví" : "Tiền vào ví",
    amount: amount.toString(),
  };
}
