import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { buildReport } from "../src/domain/income/reports";
import { reportCSV } from "../src/i18n/report-exports/income";
import type { IncomeView } from "../src/domain/income/types";
import { articles as viHelp } from "../src/features/help/content";
import { articles as enHelp } from "../src/features/help/content-en";
import { formatROI } from "../src/features/investments/format";
import {
  responseFieldErrors,
  responseMessage,
  withErrorMessages,
  type ErrorMessages,
} from "../src/i18n/error-messages";
import {
  formatDate,
  formatDecimal,
  formatMoney,
  formatMonth,
  formatTime,
  parseDecimal,
  parseInteger,
} from "../src/i18n/format";
import { localeOf } from "../src/i18n/locale";
import { english, namespaces } from "../src/i18n/messages";
import { help } from "../src/i18n/messages/help";
import { describeMessage, translate, translator } from "../src/i18n/translate";

function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = join(directory, entry.name);
    return entry.isDirectory()
      ? files(name)
      : /\.tsx?$/.test(name)
        ? [name]
        : [];
  });
}

describe("locale and exact financial formats", () => {
  it("defaults to Vietnamese and accepts only the two supported values", () => {
    for (const value of [undefined, null, "en-GB", "fr", "", {}, "VI"])
      expect(localeOf(value)).toBe("vi");
    expect(localeOf("en")).toBe("en");
    expect(translate("en", undefined)).toBe("");
    expect(translate("vi", null)).toBe("");
  });
  it("keeps large integers and decimal quantities exact in both locales", () => {
    const amount = "999999999999999999999999";
    expect(formatMoney(amount, "vi")).toBe("999.999.999.999.999.999.999.999 ₫");
    expect(formatMoney(amount, "en")).toBe("999,999,999,999,999,999,999,999 ₫");
    expect(formatMoney("-1000000", "en")).toBe("-1,000,000 ₫");
    expect(formatDecimal("9007199254740993.123456", "en")).toBe(
      "9,007,199,254,740,993.123456",
    );
    expect(formatDecimal("9007199254740993.123456", "vi")).toBe(
      "9.007.199.254.740.993,123456",
    );
    expect(formatROI("1200", "en")).toBe("12.00%");
    expect(formatROI("-1250", "vi")).toBe("−12,50%");
  });
  it("requires whole VND and complete locale grouping instead of deleting punctuation", () => {
    for (const locale of ["vi", "en"] as const) {
      expect(parseInteger("000123", locale)).toBe("123");
      expect(parseInteger("", locale)).toBe("");
      for (const value of [
        "1.2.3",
        "1,2,3",
        "1,000.00",
        "1.000,00",
        "-10",
        "1e3",
        "1 000",
      ])
        expect(parseInteger(value, locale), value).toBeNull();
    }
    expect(parseInteger("1.000.000 ₫", "vi")).toBe("1000000");
    expect(parseInteger("1,000,000 ₫", "en")).toBe("1000000");
    expect(parseInteger("1,000", "vi")).toBeNull();
    expect(parseInteger("1.000", "en")).toBeNull();
  });
  it("normalises decimal input without rounding and enforces precision", () => {
    expect(parseDecimal("1,25", "vi")).toBe("1.25");
    expect(parseDecimal("1.25", "en")).toBe("1.25");
    expect(parseDecimal("1.234,000001", "vi")).toBe("1234.000001");
    expect(parseDecimal("1,234.000001", "en")).toBe("1234.000001");
    expect(parseDecimal("1.0000001", "en")).toBeNull();
    expect(parseDecimal("1.001", "en", 2)).toBeNull();
    expect(parseDecimal("1,25", "en")).toBeNull();
    expect(parseDecimal("0.5", "vi")).toBeNull();
  });
  it("uses day/month/year and Vietnam time in both languages", () => {
    for (const locale of ["vi", "en"] as const) {
      expect(formatDate("2026-10-22", locale)).toBe("22/10/2026");
      expect(formatTime("2026-10-21T18:15:00Z", locale)).toContain(
        "22/10/2026",
      );
      expect(formatTime("2026-10-21T18:15:00Z", locale)).toContain("01:15");
    }
    expect(formatMonth("2026-10", "en")).toBe("October 2026");
    expect(formatMonth("2026-10", "vi")).toBe("Tháng 10/2026");
  });
});

describe("product messages and contextual content", () => {
  it("has matching parameters and nonempty English text for every namespace", () => {
    for (const messages of [...Object.values(namespaces), help])
      for (const [key, value] of Object.entries(messages)) {
        expect(value.trim(), key).not.toBe("");
        expect(placeholders(value), key).toEqual(placeholders(key));
      }
  });
  it("covers every literal translation call in application source", () => {
    let count = 0;
    for (const path of [
      ...files("src/components"),
      ...files("src/features"),
      ...files("src/i18n"),
    ]) {
      if (path.includes("/messages/")) continue;
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          ["tr", "t"].includes(node.expression.getText(source)) &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          expect(
            Object.hasOwn(english, node.arguments[0].text),
            `${path}: ${node.arguments[0].text}`,
          ).toBe(true);
          count++;
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(count).toBeGreaterThan(1000);
  });
  it("keeps namespace meanings and preserves interpolated account text", () => {
    expect(translator("en", "savings")("Đã chốt")).toBe("Closed");
    expect(translator("en", "investments")("Đã chốt")).toBe("Realised");
    const userName = "Tiết kiệm <script> & {0}";
    expect(translate("en", "Tài khoản của {0}", { 0: userName })).toBe(
      `Account for ${userName}`,
    );
    expect(translate("vi", "Changes saved.")).toBe("Đã lưu thay đổi.");
  });
  it("adds usable error descriptors without changing existing payload fields", () => {
    const original = {
      code: "INSUFFICIENT_FUNDS",
      error: "Không đủ tiền tại ngày 2026-10-22.",
      fieldErrors: { amount: "Số tiền phải lớn hơn 0." },
    };
    const result = withErrorMessages(original) as typeof original &
      ErrorMessages;
    expect(result).toMatchObject(original);
    expect(result.messageKey).toBe("Không đủ tiền tại ngày {0}.");
    expect(result.messageParams).toEqual({ 0: "2026-10-22" });
    expect(responseMessage(result, "fallback")).toBe(original.error);
    expect(responseFieldErrors(result)).toEqual(original.fieldErrors);
    expect(translate("en", result.error)).toBe(
      "Insufficient cash on 2026-10-22.",
    );
    expect(describeMessage("A private unknown error")).toBeUndefined();
    const success = { amount: "123", name: "Tiết kiệm" };
    expect(withErrorMessages(success)).toBe(success);
  });
  it("has complete English help with the same stable anchors and no Vietnamese prose", () => {
    expect(Object.keys(enHelp)).toEqual(Object.keys(viHelp));
    for (const [page, article] of Object.entries(enHelp)) {
      const source = viHelp[page as keyof typeof viHelp];
      expect(
        article.sections.map((s) => [s.id, s.items?.map((i) => i.id)]),
      ).toEqual(source.sections.map((s) => [s.id, s.items?.map((i) => i.id)]));
      expect(
        JSON.stringify(article).replaceAll("Tiếng Việt", ""),
        page,
      ).not.toMatch(/[ĂăÂâĐđÊêÔôƠơƯư\u0300-\u036f]/u);
      for (const task of article.sections.find((s) => s.id === "tasks")!.items!)
        expect(task.result).toMatch(/^Result:/);
    }
  });
  it("localises CSV labels while retaining canonical data and formula escaping", () => {
    const view = {
      year: 2026,
      today: "2026-10-22",
      currentMonth: "2026-10",
      rows: [
        {
          key: "category",
          categoryId: "category",
          month: "2026-10",
          name: "=SUM(A1)",
          description: "Tên người dùng",
          note: "Ghi chú riêng",
          amount: "1000000",
          kind: "fixed",
          active: true,
        },
      ],
    } as unknown as IncomeView;
    const report = buildReport(view, {
      year: 2026,
      from: 10,
      to: 10,
      kind: "all",
    });
    const vi = reportCSV(report),
      en = reportCSV(report, "en");
    expect(vi).toContain('"Loại"');
    expect(en).toContain('"Type"');
    for (const csv of [vi, en]) {
      expect(csv).toContain("'=SUM(A1)");
      expect(csv).toContain("1000000");
      expect(csv).toContain("2026-10");
      expect(csv).toContain("Tên người dùng");
      expect(csv).toContain("Ghi chú riêng");
    }
    expect(en).not.toContain("Tổng đã ghi nhận");
  });
});
