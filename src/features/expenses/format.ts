export function money(value: string): string {
  return `${BigInt(value).toLocaleString("vi-VN")} ₫`;
}
export function monthName(value: string): string {
  return `Tháng ${Number(value.slice(5))}/${value.slice(0, 4)}`;
}
export function sum(values: string[]): string {
  return values.reduce((n, v) => n + BigInt(v), 0n).toString();
}
export function ratio(value: string, maximum: string): number {
  return BigInt(maximum) === 0n
    ? 0
    : Number((BigInt(value) * 10000n) / BigInt(maximum)) / 100;
}
