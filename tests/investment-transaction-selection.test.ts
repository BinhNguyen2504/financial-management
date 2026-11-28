import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyAction, emptyBook } from "../src/domain/investments/engine";
import { actionSchema } from "../src/domain/investments/schema";
import {
  portfolioIdOf,
  selectionForCategory,
  selectionForKind,
} from "../src/features/investments/transaction-selection";

const clock = { today: "2027-03-15", now: "2027-03-15T12:00:00Z" },
  start = "2026-12-01",
  date = "2027-03-01";

function setup() {
  let book = emptyBook();
  const asset = randomUUID(),
    main = randomUUID(),
    second = randomUUID(),
    other = randomUUID(),
    otherWallet = randomUUID();
  const act = (action: unknown) => {
    book = applyAction(book, actionSchema.parse(action), clock);
  };
  for (const [id, walletId, name] of [
    [asset, main, "Cổ phiếu"],
    [other, otherWallet, "Vàng"],
  ])
    act({
      type: "createCategory",
      id,
      walletId,
      start,
      kind: "investment",
      name,
    });
  act({
    type: "createCategory",
    id: second,
    parentCategoryId: asset,
    start,
    kind: "cash",
    name: "Ví phụ",
  });
  const picked = (categoryId: string, cashCategoryId: string) => ({
    categoryId,
    cashCategoryId,
    portfolioId: portfolioIdOf(book, categoryId),
  });
  return { book, asset, main, second, other, otherWallet, picked };
}

describe("transaction type changes keep the portfolio", () => {
  it.each(["openingCash", "deposit", "withdraw", "transfer"] as const)(
    "%s moves to the settlement wallet and back to the portfolio",
    (kind) => {
      const { book, asset, main, picked } = setup();
      const wallet = selectionForKind(book, kind, picked(asset, main), date);
      expect(wallet).toEqual({
        categoryId: main,
        cashCategoryId: "",
        portfolioId: asset,
      });
      expect(selectionForKind(book, "buy", wallet, date)).toEqual(
        picked(asset, main),
      );
    },
  );

  it("remembers a secondary wallet across a round trip", () => {
    const { book, asset, second, picked } = setup();
    const wallet = selectionForKind(
      book,
      "withdraw",
      picked(asset, second),
      date,
    );
    expect(wallet.categoryId).toBe(second);
    expect(selectionForKind(book, "sell", wallet, date)).toEqual(
      picked(asset, second),
    );
  });

  it("restores the parent portfolio when entered from a wallet", () => {
    const { book, asset, second, picked } = setup();
    expect(selectionForKind(book, "buy", picked(second, ""), date)).toEqual(
      picked(asset, second),
    );
  });

  it("keeps the wallet and clears the destination between wallet types", () => {
    const { book, main, second, picked } = setup();
    expect(
      selectionForKind(book, "withdraw", picked(second, main), date),
    ).toEqual(picked(second, ""));
  });

  it("leaves an empty form empty", () => {
    const { book, picked } = setup();
    for (const kind of ["deposit", "buy"] as const)
      expect(selectionForKind(book, kind, picked("", ""), date)).toEqual(
        picked("", ""),
      );
  });

  it("selects nothing before the start date but keeps the portfolio", () => {
    const { book, asset, main, picked } = setup();
    const early = selectionForKind(
      book,
      "deposit",
      picked(asset, main),
      "2026-11-01",
    );
    expect(early).toEqual({
      categoryId: "",
      cashCategoryId: "",
      portfolioId: asset,
    });
    expect(selectionForKind(book, "buy", early, date)).toEqual(
      picked(asset, main),
    );
  });
});

describe("explicit category choices", () => {
  it("replaces the portfolio and its settlement wallet", () => {
    const { book, asset, main, other, otherWallet, picked } = setup();
    expect(
      selectionForCategory(book, "buy", other, picked(asset, main), date),
    ).toEqual(picked(other, otherWallet));
  });

  it.each(["valuation", "openingInvestment"] as const)(
    "leaves the unused wallet field alone for %s, so a revert is no change",
    (kind) => {
      const { book, asset, other, picked } = setup();
      const original = picked(asset, "");
      const moved = selectionForCategory(book, kind, other, original, date);
      expect(
        selectionForCategory(book, kind, asset, moved, date),
      ).toEqual(original);
      expect(selectionForKind(book, "buy", moved, date).cashCategoryId).toBe(
        selectionForCategory(book, "buy", other, moved, date).cashCategoryId,
      );
    },
  );

  it("forgets the portfolio when the choice is cleared", () => {
    const { book, asset, main, picked } = setup();
    const cleared = selectionForCategory(
      book,
      "buy",
      "",
      picked(asset, main),
      date,
    );
    expect(cleared).toEqual(picked("", ""));
    expect(selectionForKind(book, "deposit", cleared, date).categoryId).toBe(
      "",
    );
  });

  it("clears a transfer destination equal to the new source", () => {
    const { book, main, second, picked } = setup();
    expect(
      selectionForCategory(
        book,
        "transfer",
        second,
        picked(main, second),
        date,
      ),
    ).toEqual(picked(second, ""));
    expect(
      selectionForCategory(book, "transfer", main, picked(second, main), date)
        .cashCategoryId,
    ).toBe("");
    expect(
      selectionForCategory(book, "transfer", second, picked(second, main), date)
        .cashCategoryId,
    ).toBe(main);
  });
});
