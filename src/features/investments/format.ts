/** Percentage stored as hundredths of a percent; retain integer precision for large values. */
export function formatROI(value: string | null) {
  if (value === null) return "—";
  const n = BigInt(value),
    sign = n < 0n ? "−" : "",
    abs = n < 0n ? -n : n;
  return `${sign}${(abs / 100n).toLocaleString("vi-VN")},${(abs % 100n).toString().padStart(2, "0")}%`;
}
