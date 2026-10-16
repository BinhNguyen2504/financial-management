export const EMOJI_VALUES = [
  "🍜",
  "🏡",
  "🚲",
  "🌱",
  "☕",
  "🛒",
  "💡",
  "📚",
  "💚",
  "✈️",
  "🎁",
  "🐾",
  "🎨",
  "🫙",
] as const;
export const EMOJI_NAMES = [
  "Ăn uống",
  "Nhà ở",
  "Di chuyển",
  "Tích lũy",
  "Cà phê",
  "Mua sắm",
  "Hóa đơn",
  "Học tập",
  "Sức khỏe",
  "Du lịch",
  "Quà tặng",
  "Thú cưng",
  "Sở thích",
  "Hũ chi tiêu",
];
export type JarEmoji = (typeof EMOJI_VALUES)[number];

export function jarEmoji(
  name: string,
  kind = "monthly",
  selected?: string | null,
): string {
  if (selected && EMOJI_VALUES.includes(selected as JarEmoji)) return selected;
  const text = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const matches: [RegExp, JarEmoji][] = [
    [/an uong|thuc pham|bua an|food/, "🍜"],
    [/nha|thue|home/, "🏡"],
    [/di chuyen|xe|xang|transport/, "🚲"],
    [/ca phe|cafe|coffee/, "☕"],
    [/mua sam|shopping/, "🛒"],
    [/dien|nuoc|internet|hoa don/, "💡"],
    [/hoc|sach|giao duc/, "📚"],
    [/suc khoe|y te|thuoc/, "💚"],
    [/du lich|nghi duong/, "✈️"],
    [/qua|sinh nhat/, "🎁"],
    [/thu cung|meo|cho /, "🐾"],
    [/so thich|giai tri/, "🎨"],
    [/tich luy|tiet kiem/, "🌱"],
  ];
  return (
    matches.find(([pattern]) => pattern.test(text))?.[1] ??
    (kind === "accumulation" ? "🌱" : "🫙")
  );
}
