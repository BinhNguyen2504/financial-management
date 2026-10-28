import { describe, expect, it } from "vitest";
import {
  integerInput,
  normalizeInteger,
  normalizedMoneyFields,
  comparable,
} from "../src/lib/form-values";
import { EMOJI_NAMES, EMOJI_VALUES } from "../src/domain/expenses/emoji";
import { tableSchemas } from "../src/domain/backup/format";
import {
  paymentBrands,
  suggestedBrand,
} from "../src/domain/expenses/label-visuals";
import { fieldErrorsFromIssues } from "../src/lib/field-errors";
import { readFileSync } from "node:fs";
import { applyAction, ExpenseError } from "../src/domain/expenses/engine";

describe("monetary drafts and presentation compatibility", () => {
  it("localizes schema hints and compares canonical money without changing decimal quantities", () => {
    expect(
      fieldErrorsFromIssues([
        {
          path: ["replacement", "name"],
          message: "Too small: expected string to have >=1 characters",
        },
      ]),
    ).toEqual({ name: "Nhập tên từ 1 đến 100 ký tự." });
    expect(
      fieldErrorsFromIssues([
        { path: ["amount"], message: "Số tiền phải lớn hơn 0." },
      ]).amount,
    ).toBe("Số tiền phải lớn hơn 0.");
    expect(
      fieldErrorsFromIssues(
        [{ path: ["multipliers", "emergency"], message: "Invalid string" }],
        true,
      ),
    ).toHaveProperty("multipliers.emergency");
    expect(
      normalizedMoneyFields({
        amount: "000777",
        quantity: "0.125",
        note: "",
        fee: "000",
      }),
    ).toEqual({ amount: "777", quantity: "0.125", note: "", fee: "0" });
  });
  it("validates configured classifications without rewriting historical selections or dropping visual metadata", () => {
    const clock = { today: "2026-10-19", now: "2026-10-19T00:00:00.000Z" };
    const jarId = "10000000-0000-4000-8000-000000000001";
    const labelId = "20000000-0000-4000-8000-000000000001";
    let book = applyAction(
      null,
      { type: "initialize", start: "2026-10" },
      clock,
    );
    book = applyAction(
      book,
      {
        type: "createJar",
        id: jarId,
        kind: "monthly",
        start: "2026-10",
        opening: "0",
        name: "Hũ cũ",
        description: "",
        method: "Phân loại cũ",
        group: "",
        amount: "100",
      },
      clock,
    );
    book = applyAction(
      book,
      {
        type: "upsertLabel",
        id: labelId,
        kind: "method",
        name: "MoMo",
        brandKey: "momo",
      },
      clock,
    );
    const configure = {
      type: "configureJar" as const,
      jarId,
      month: "2026-10",
      name: "Đổi tên",
      description: "",
      method: "Phân loại cũ",
      group: "",
      amount: "100",
    };
    expect(() => applyAction(book, configure, clock)).not.toThrow();
    try {
      applyAction(
        book,
        { ...configure, method: "Giá trị ngoài danh sách" },
        clock,
      );
      throw new Error("Should reject an unknown classification");
    } catch (error) {
      expect(error).toBeInstanceOf(ExpenseError);
      expect((error as ExpenseError).fieldErrors).toHaveProperty("method");
    }
    book = applyAction(
      book,
      { type: "upsertLabel", id: labelId, kind: "method", name: "Ví MoMo" },
      clock,
    );
    expect(book.labels[0].brandKey).toBe("momo");
  });
  it("preserves missing versus zero and normalizes without losing large amounts", () => {
    expect(normalizeInteger("")).toBe("");
    expect(normalizeInteger("000")).toBe("0");
    expect(normalizeInteger("0007777777777")).toBe("7777777777");
    expect(normalizeInteger("000999999999999999999999999")).toBe(
      "999999999999999999999999",
    );
    expect(integerInput("1.234.567 ₫")).toBe("1234567");
    for (const invalid of ["1e9", "-5", "+5", "12a", "1/2"])
      expect(integerInput(invalid)).toBeNull();
  });
  it("compares meaningful draft values independently of key order and surrounding whitespace", () => {
    expect(comparable({ name: " Lương ", note: "", amount: "0" })).toBe(
      comparable({ amount: "0", name: "Lương", note: "" }),
    );
    expect(comparable({ amount: "" })).not.toBe(comparable({ amount: "0" }));
  });
  it("reads old classification backups and preserves new visual metadata", () => {
    const old = {
      id: "10000000-0000-4000-8000-000000000001",
      kind: "method",
      name: "MoMo",
    };
    expect(tableSchemas.expense_labels.parse(old)).toMatchObject({
      brand_key: null,
      icon_key: null,
    });
    expect(
      tableSchemas.expense_labels.parse({
        ...old,
        brand_key: "momo",
        icon_key: null,
      }).brand_key,
    ).toBe("momo");
  });
  it("ships labeled jar choices and local assets for every offered brand", () => {
    expect(EMOJI_VALUES.length).toBeGreaterThanOrEqual(90);
    expect(EMOJI_VALUES).toHaveLength(EMOJI_NAMES.length);
    expect(new Set(EMOJI_VALUES).size).toBe(EMOJI_VALUES.length);
    expect(suggestedBrand("  MOMO ")?.key).toBe("momo");
    expect(suggestedBrand("Quỹ MoMo gia đình")).toBeUndefined();
    expect(paymentBrands).toHaveLength(27);
    expect(suggestedBrand("  VIETTELPAY  ")?.key).toBe("viettelmoney");
    expect(suggestedBrand("TPB")?.key).toBe("tpbank");
    const sources = JSON.parse(
      readFileSync("public/brands/sources.json", "utf8"),
    ).sources;
    for (const brand of paymentBrands) {
      expect(brand.category).toMatch(/^(bank|wallet)$/);
      expect(
        sources[brand.file] ?? sources[brand.file.replace(/\.png$/, ".svg")],
      ).toBeTruthy();
      expect(
        readFileSync(`public/brands/${brand.file}`).byteLength,
      ).toBeGreaterThan(100);
    }
  });
});
