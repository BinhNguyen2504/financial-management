import { describe, expect, it } from "vitest";
import { monthInYear } from "../src/lib/month-period";
import { userFacingError } from "../src/i18n/user-facing-errors";
import { translate } from "../src/i18n/translate";

describe("month-only selection boundaries", () => {
  it("preserves the month and stays independent of timezones", () => {
    expect(monthInYear("2026-12", 2024, "2000-01", "2099-12")).toBe("2024-12");
    expect(monthInYear("2026-01", 2000, "2000-01", "2099-12")).toBe("2000-01");
  });
  it("clamps the same month to the beginning and end of an allowed period", () => {
    expect(monthInYear("2026-02", 2024, "2024-06", "2026-10")).toBe("2024-06");
    expect(monthInYear("2024-12", 2026, "2024-06", "2026-10")).toBe("2026-10");
  });
});

describe("plain-language error presentation", () => {
  it("does not translate arbitrary notices or names as compact month labels", () => {
    for (const text of [
      "Mạng kiểm thử tạm gián đoạn",
      "Tạm nghỉ riêng",
      "Momo của tôi",
    ])
      for (const locale of ["vi", "en"] as const)
        expect(translate(locale, text)).toBe(text);
    expect(translate("en", "T6")).toBe("M6");
    expect(translate("vi", "M12")).toBe("T12");
  });
  it("keeps setup instructions out of financial forms in both languages", () => {
    const message = userFacingError(
      "Apply migration 202610190002_label_visuals.sql",
      "LABEL_VISUALS_MIGRATION_REQUIRED",
    );
    expect(message).toContain("Chưa lưu");
    expect(message).toContain("được giữ");
    expect(translate("en", message)).toContain("has not been saved");
    expect(
      userFacingError("SQLSTATE 42P01 relation missing", undefined, "Thử lại."),
    ).toBe("Thử lại.");
  });
  it("preserves financial messages and user content that happens to contain technical words", () => {
    const message = "Không đủ tiền để thực hiện giao dịch.";
    expect(userFacingError(message)).toBe(message);
    const name = "Cấu hình Supabase";
    const confirmation = `Xóa danh mục “${name}” chưa có số thu.`;
    expect(userFacingError(confirmation)).toBe(confirmation);
  });
});
