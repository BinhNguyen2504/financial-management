import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { applyAction, replay } from "../src/domain/savings/engine";
import { actionSchema, transactionSchema } from "../src/domain/savings/schema";
import { savingsImpact } from "../src/features/savings/presentation";
import type { SavingsBook } from "../src/domain/savings/types";

describe("Savings details show the selected asset's actual movement", () => {
  it("matches replay cash deltas including both transfer sides, fees, gold and deposits without losing integer precision", () => {
    const clock = { today: "2026-10-18", now: "2026-10-18T00:00:00Z" };
    let book: SavingsBook | null = null;
    const cash = randomUUID(),
      other = randomUUID(),
      gold = randomUUID(),
      deposit = randomUUID();
    for (const [id, kind] of [
      [cash, "cash"],
      [other, "cash"],
      [gold, "gold"],
      [deposit, "deposit"],
    ])
      book = applyAction(
        book,
        actionSchema.parse({
          type: "createCategory",
          id,
          kind,
          start: "2026-01",
          name: kind,
          unit: kind === "gold" ? "chỉ" : null,
        }),
        clock,
      );
    const post = (kind: string, categoryId: string, fields: object) => {
      const t = transactionSchema.parse({
        id: randomUUID(),
        kind,
        categoryId,
        date: "2026-01-01",
        ...fields,
      });
      const before = replay(book!, clock.today);
      book = applyAction(
        book,
        { type: "postTransaction", transaction: t },
        clock,
      );
      const after = replay(book, clock.today);
      const effect = after.effects.find((e) => e.id === t.id)!;
      for (const p of after.positions.filter(
        (p) =>
          p.kind === "cash" &&
          (p.id === t.categoryId ||
            ("cashCategoryId" in t && p.id === t.cashCategoryId)),
      )) {
        const delta =
          BigInt(p.cash) -
          BigInt(before.positions.find((b) => b.id === p.id)!.cash);
        expect(savingsImpact(t, effect, p).amount, kind).toBe(delta.toString());
      }
      return {
        t,
        effect,
        p: after.positions.find((p) => p.id === categoryId)!,
      };
    };
    post("openingCash", cash, { amount: "900719925474099312345" });
    post("deposit", cash, { amount: "200" });
    post("withdraw", cash, { amount: "100", fee: "3", tax: "2" });
    post("transfer", cash, {
      amount: "10000",
      cashCategoryId: other,
      fee: "4",
      tax: "1",
    });
    post("fee", other, { amount: "50" });
    const opening = post("openingGold", gold, {
      amount: "1000",
      quantity: "1",
      unitPrice: "2000",
    });
    expect(savingsImpact(opening.t, opening.effect, opening.p).amount).toBe(
      "1000",
    );
    post("buyGold", gold, {
      quantity: "0.5",
      unitPrice: "2000",
      fee: "3",
      cashCategoryId: cash,
    });
    const sell = post("sellGold", gold, {
      allocations: [{ lotId: opening.t.id, quantity: "0.25" }],
      unitPrice: "3000",
      fee: "4",
      tax: "1",
      cashCategoryId: cash,
    });
    expect(savingsImpact(sell.t, sell.effect, sell.p)).toMatchObject({
      amount: "745",
      quantity: "−0.25",
    });
    const contract = post("openDeposit", deposit, {
      amount: "5000",
      name: "Sổ",
      maturity: "2026-10-01",
      cashCategoryId: cash,
    });
    const interest = post("interest", deposit, {
      amount: "100",
      contractId: contract.t.id,
      capitalize: false,
      cashCategoryId: cash,
    });
    expect(savingsImpact(interest.t, interest.effect, interest.p).label).toBe(
      "Lãi trả ra ngoài sổ",
    );
    post("withdrawDeposit", deposit, {
      amount: "500",
      interest: "20",
      contractId: contract.t.id,
      fee: "2",
      cashCategoryId: cash,
    });
    const roll = post("rollover", deposit, {
      contractId: contract.t.id,
      interest: "100",
      reinvestInterest: "80",
      fee: "5",
      name: "Tái tục",
      maturity: "2027-01-01",
      cashCategoryId: cash,
    });
    expect(savingsImpact(roll.t, roll.effect, roll.p)).toMatchObject({
      label: "Lãi nhập vào sổ tái tục",
      amount: "80",
    });
    expect(savingsImpact(roll.t, undefined, roll.p).amount).toBeNull();
  });
});
