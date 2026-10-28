/** Month-only values stay strings: changing a period must never introduce a timezone. */
export function monthInYear(
  value: string,
  year: number,
  min: string,
  max: string,
) {
  const next = `${year}-${value.slice(5, 7) || "01"}`;
  return next < min ? min : next > max ? max : next;
}
