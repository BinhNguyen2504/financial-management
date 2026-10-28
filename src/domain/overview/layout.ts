import { z } from "zod";

export const widgetIds = [
  "attention",
  "income",
  "expenses",
  "savings",
  "investments",
  "funds",
  "allocation",
  "jars",
  "maturities",
  "peace",
] as const;
export type WidgetId = (typeof widgetIds)[number];
export const layoutSchema = z.strictObject({
  schemaVersion: z.literal(1),
  widgets: z
    .array(z.enum(widgetIds))
    .max(10)
    .refine((v) => new Set(v).size === v.length, "Widget không được trùng."),
  jarIds: z
    .array(z.uuid())
    .max(5)
    .refine((v) => new Set(v).size === v.length, "Hũ không được trùng."),
});
export type OverviewLayout = z.infer<typeof layoutSchema>;
export type SavedLayout = OverviewLayout & { revision: number };
export const saveLayoutSchema = layoutSchema.extend({
  expectedRevision: z.number().int().min(0).max(2147483646),
});
export function defaultLayout(): SavedLayout {
  return {
    schemaVersion: 1,
    widgets: [
      "attention",
      "income",
      "expenses",
      "savings",
      "investments",
      "funds",
    ],
    jarIds: [],
    revision: 0,
  };
}
export const widgetCatalog: Record<
  WidgetId,
  { title: string; description: string; href?: string }
> = {
  attention: {
    title: "Cần chú ý",
    description: "Những khoản cần kiểm tra trong năm module.",
  },
  income: {
    title: "Thu nhập tháng này",
    description: "Thực nhận, cố định, phát sinh và khoản chưa nhập.",
    href: "/income",
  },
  expenses: {
    title: "Chi tiêu tháng này",
    description: "Mức tháng, thực chi và số còn trong hũ.",
    href: "/budgets",
  },
  savings: {
    title: "Tiết kiệm hiện tại",
    description: "Tiền, sổ tiết kiệm và vàng theo định giá đã nhập.",
    href: "/savings",
  },
  investments: {
    title: "Đầu tư hiện tại",
    description: "Giá trị, vốn, lãi/lỗ chưa chốt và tiền chờ.",
    href: "/investments",
  },
  funds: {
    title: "Quỹ an toàn",
    description: "Tiến độ ba quỹ và số tháng dự phòng.",
    href: "/funds",
  },
  allocation: {
    title: "Phân bổ chi tiêu",
    description: "Thực chi tháng này theo nhóm mục đích.",
    href: "/budgets",
  },
  jars: {
    title: "Hũ theo dõi",
    description: "Chọn tối đa 5 hũ bạn muốn xem thường xuyên.",
    href: "/budgets",
  },
  maturities: {
    title: "Sổ sắp đáo hạn",
    description: "Sổ đã đến hạn và sẽ đáo hạn trong 7 ngày.",
    href: "/savings",
  },
  peace: {
    title: "Một chút bình yên",
    description: "Lời nhắn mỗi ngày theo chủ đề của bạn.",
  },
};
