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
    widgets: ["income", "expenses", "savings", "investments", "funds"],
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
    description: "Những khoản cần kiểm tra trong các module đang hiển thị.",
  },
  income: {
    title: "Thu nhập tháng này",
    description: "Tổng thực nhận tháng này và khoản chưa nhập.",
    href: "/income",
  },
  expenses: {
    title: "Chi tiêu tháng này",
    description: "Thực chi tháng này và mức tháng.",
    href: "/budgets",
  },
  savings: {
    title: "Tiết kiệm hiện tại",
    description: "Tổng giá trị tiết kiệm và trạng thái định giá.",
    href: "/savings",
  },
  investments: {
    title: "Đầu tư hiện tại",
    description: "Tổng giá trị và lãi/lỗ chưa chốt.",
    href: "/investments",
  },
  funds: {
    title: "Quỹ an toàn",
    description: "Tổng dự phòng và số tháng Emergency.",
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
