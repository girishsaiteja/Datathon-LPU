import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from "@/lib/constants";
import type { DateRange } from "@/lib/types";

export const DATE_RANGE_COOKIE = "upi-guard-date-range";
export const DATE_RANGE_STORAGE_KEY = "upi-guard-date-range";
export const DATE_RANGE_EVENT = "upi-guard-date-range";

export function clampDateRange(next: DateRange): DateRange {
  let from = next.from < DEFAULT_DATE_FROM ? DEFAULT_DATE_FROM : next.from;
  let to = next.to > DEFAULT_DATE_TO ? DEFAULT_DATE_TO : next.to;
  if (from > DEFAULT_DATE_TO) from = DEFAULT_DATE_FROM;
  if (to < DEFAULT_DATE_FROM) to = DEFAULT_DATE_TO;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

export function parseDateRangeToken(raw?: string | null): DateRange | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DateRange>;
    if (typeof parsed.from === "string" && typeof parsed.to === "string") {
      return clampDateRange({ from: parsed.from, to: parsed.to });
    }
  } catch {
    const [from, to] = raw.split("_");
    if (from && to) return clampDateRange({ from, to });
  }
  return null;
}

export function serializeDateRangeCookie(range: DateRange) {
  return `${range.from}_${range.to}`;
}
