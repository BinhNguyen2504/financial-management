/** Integer VND stays exact across totals, reports and exports. */
export const sumMoney = (values: string[]) =>
  values.reduce((total, value) => total + BigInt(value), 0n).toString();

export function ratio(value: string, maximum: string): number {
  return BigInt(maximum) === 0n
    ? 0
    : Number((BigInt(value) * 10000n) / BigInt(maximum)) / 100;
}
