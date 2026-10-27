export const endOfMonth = (m: string) =>
  new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 0))
    .toISOString()
    .slice(0, 10);
export const previousDate = (d: string) =>
  new Date(new Date(`${d}T00:00:00Z`).valueOf() - 86400000)
    .toISOString()
    .slice(0, 10);
export const nextMonth = (m: string) =>
  new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 1))
    .toISOString()
    .slice(0, 7);
