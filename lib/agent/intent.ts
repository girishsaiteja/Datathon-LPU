import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from "@/lib/constants";

export type QuestionIntent = "analytics" | "invalid" | "destructive" | "out_of_range";

const DESTRUCTIVE =
  /\b(delete|truncate|wipe|destroy|erase|hack|exploit|insert\s+into|update\s+\w+\s+set|alter\s+table|grant|revoke|rm\s+-rf|remove\s+all|clear\s+the\s+(db|database)|shutdown|sql\s+injection|bypass\s+(auth|kyc)|poison)\b/i;

const DROP_DESTRUCTIVE = /\bdrop\s+(table|database|schema|index|view|column|all)\b/i;

const WRITE_DESTRUCTIVE =
  /\b(update|modify|overwrite|write to)\b.{0,40}\b(score|scores|record|records|table|database|row|rows)\b/i;

const ANALYTICS =
  /transaction|txn|merchant|chargeback|dispute|kyc|fraud|volume|amount|sales|gmv|user|customer|categor|ratio|rate|utr|cluster|risk|severity|upi|fail|success|atv|ticket|city|state|region|occupation|status|reason|payment|dashboard|q[1-4]|quarter|trend|scatter|correlation|pending|analyse|analyze|insight|graph|chart|compare|highest|lowest|top|peak|delay|occupat|business type|leaderboard|heatmap|map|which one|biggest/i;

const STRONG_METRIC =
  /kyc|chargeback|merchant|fraud|cluster|risk|txn|transaction|volume|dispute|severity|ratio|rate|gmv|atv/i;

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_RE = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDay(year: number, month: number, day: number) {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthEnd(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function overlapsDataset(from: string, to: string) {
  return !(to < DEFAULT_DATE_FROM || from > DEFAULT_DATE_TO);
}

type Span = { from: string; to: string; invalidCalendar?: boolean };

function extractDateSpans(question: string): Span[] {
  const q = question.toLowerCase();
  const spans: Span[] = [];
  const used: [number, number][] = [];
  const take = (start: number, end: number) => {
    if (used.some(([a, b]) => start < b && end > a)) return false;
    used.push([start, end]);
    return true;
  };

  for (const match of q.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    if (!take(match.index ?? 0, (match.index ?? 0) + match[0].length)) continue;
    const day = isoDay(Number(match[1]), Number(match[2]), Number(match[3]));
    spans.push(day ? { from: day, to: day } : { from: match[0], to: match[0], invalidCalendar: true });
  }

  const monthDayYear = new RegExp(`\\b(${MONTH_RE})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?\\s*(\\d{4})?\\b`, "g");
  for (const match of q.matchAll(monthDayYear)) {
    if (!take(match.index ?? 0, (match.index ?? 0) + match[0].length)) continue;
    const monthNum = MONTHS[match[1]] ?? MONTHS[match[1].slice(0, 3)];
    if (!monthNum) continue;
    const year = match[3] ? Number(match[3]) : 2026;
    const day = isoDay(year, monthNum, Number(match[2]));
    spans.push(day ? { from: day, to: day } : { from: match[0], to: match[0], invalidCalendar: true });
  }

  const dayMonthYear = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})(?:,)?\\s*(\\d{4})?\\b`, "g");
  for (const match of q.matchAll(dayMonthYear)) {
    if (!take(match.index ?? 0, (match.index ?? 0) + match[0].length)) continue;
    const monthNum = MONTHS[match[2]] ?? MONTHS[match[2].slice(0, 3)];
    if (!monthNum) continue;
    const year = match[3] ? Number(match[3]) : 2026;
    const day = isoDay(year, monthNum, Number(match[1]));
    spans.push(day ? { from: day, to: day } : { from: match[0], to: match[0], invalidCalendar: true });
  }

  for (const match of q.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g)) {
    if (!take(match.index ?? 0, (match.index ?? 0) + match[0].length)) continue;
    const a = Number(match[1]);
    const b = Number(match[2]);
    const year = Number(match[3]);
    const dayFirst = a > 12;
    const month = dayFirst ? b : a;
    const dayNum = dayFirst ? a : b;
    const day = isoDay(year, month, dayNum) ?? (a > 12 ? isoDay(year, a, b) : isoDay(year, b, a));
    spans.push(day ? { from: day, to: day } : { from: match[0], to: match[0], invalidCalendar: true });
  }

  const monthYear = new RegExp(`\\b(${MONTH_RE})\\s+(\\d{4})\\b`, "g");
  for (const match of q.matchAll(monthYear)) {
    if (!take(match.index ?? 0, (match.index ?? 0) + match[0].length)) continue;
    const monthNum = MONTHS[match[1]] ?? MONTHS[match[1].slice(0, 3)];
    if (!monthNum) continue;
    const year = Number(match[2]);
    const from = isoDay(year, monthNum, 1);
    const to = isoDay(year, monthNum, monthEnd(year, monthNum));
    if (from && to) spans.push({ from, to });
  }

  if (/\bq1\b/.test(q)) spans.push({ from: "2026-01-01", to: "2026-03-31" });
  if (/\bq2\b/.test(q)) spans.push({ from: "2026-04-01", to: "2026-06-30" });
  if (/\bq3\b/.test(q)) spans.push({ from: "2026-07-01", to: "2026-09-30" });
  if (/\bq4\b/.test(q)) spans.push({ from: "2026-10-01", to: "2026-12-31" });

  for (const match of q.matchAll(/\b(20[12]\d)\b/g)) {
    if (!take(match.index ?? 0, (match.index ?? 0) + match[0].length)) continue;
    const year = Number(match[1]);
    spans.push({ from: `${year}-01-01`, to: `${year}-12-31` });
  }

  return spans;
}

export function datasetDateIssue(question: string): string | null {
  const spans = extractDateSpans(question);
  if (spans.some((span) => span.invalidCalendar)) {
    return "That date is not a real calendar date, so I cannot analyse it. Ask about a date between 1 Jan 2026 and 3 Dec 2026.";
  }
  const outside = spans.find((span) => !overlapsDataset(span.from, span.to));
  if (outside) {
    return "This dataset only covers 1 Jan 2026 to 3 Dec 2026. There is no data for that date, so I cannot answer that. Ask about a period inside this window.";
  }
  return null;
}

export function classifyIntent(question: string): QuestionIntent {
  const q = question.trim();
  if (!q) return "invalid";
  if (DESTRUCTIVE.test(q) || DROP_DESTRUCTIVE.test(q) || WRITE_DESTRUCTIVE.test(q)) return "destructive";
  if (datasetDateIssue(q)) return "out_of_range";

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && !STRONG_METRIC.test(q)) return "invalid";
  if (
    /^(hi|hey|hello|help|thanks|ok|yes|no|what|which one|show me|show me everything)\b/i.test(q) &&
    words.length <= 4 &&
    !STRONG_METRIC.test(q)
  ) {
    return "invalid";
  }

  if (ANALYTICS.test(q)) return "analytics";
  return "invalid";
}

export const DESTRUCTIVE_MESSAGE =
  "That request is invalid. This agent is read-only and cannot delete, change, or wipe any database or records.";

export const INVALID_MESSAGE =
  "I can only answer analysis questions about this UPI dataset — transactions, merchants, chargebacks, KYC, clusters, and risk. Please ask a question related to the data.";

export const OUT_OF_RANGE_MESSAGE =
  "This dataset only covers 1 Jan 2026 to 3 Dec 2026. There is no data for that date, so I cannot answer that. Ask about a period inside this window.";

export function refusalMessage(question: string, intent: QuestionIntent) {
  if (intent === "destructive") return DESTRUCTIVE_MESSAGE;
  if (intent === "out_of_range") return datasetDateIssue(question) || OUT_OF_RANGE_MESSAGE;
  return INVALID_MESSAGE;
}
