import { ratio } from "./format";
export interface ChartSlice {
  key: string;
  label: string;
  value: string;
  percent: number;
}
export function donutSlices(
  items: { key: string; label: string; spent: string }[],
): ChartSlice[] {
  const positive = items
    .filter((r) => BigInt(r.spent) > 0n)
    .sort((a, b) =>
      BigInt(a.spent) > BigInt(b.spent)
        ? -1
        : BigInt(a.spent) < BigInt(b.spent)
          ? 1
          : a.key.localeCompare(b.key),
    );
  let otherKey = "__other__";
  while (items.some((item) => item.key === otherKey)) otherKey += "_";
  const grouped =
    positive.length > 5
      ? [
          ...positive.slice(0, 4),
          {
            key: otherKey,
            label: "Khác",
            spent: positive
              .slice(4)
              .reduce((sum, r) => sum + BigInt(r.spent), 0n)
              .toString(),
          },
        ]
      : positive;
  const total = grouped
    .reduce((sum, r) => sum + BigInt(r.spent), 0n)
    .toString();
  return grouped.map((r) => ({
    key: r.key,
    label: r.label,
    value: r.spent,
    percent: ratio(r.spent, total),
  }));
}
