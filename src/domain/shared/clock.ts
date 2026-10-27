import type { Clock } from "./types";

export function vietnamClock(date = new Date()): Clock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    today: `${part("year")}-${part("month")}-${part("day")}`,
    now: date.toISOString(),
  };
}
export function incomeClock(): Clock {
  const now = new Date();
  return {
    today: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
    now: now.toISOString(),
  };
}
export function savingsClock(): Clock {
  const now = new Date();
  return {
    now: now.toISOString(),
    today: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
  };
}
