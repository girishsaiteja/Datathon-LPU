import { format, parseISO } from "date-fns";

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatINR(value: number) {
  return `₹ ${formatNumber(value, 0)}`;
}

export function formatCrore(value: number, digits = 1) {
  return `₹ ${formatNumber(value, digits)} Cr`;
}

export function formatLakh(value: number, digits = 1) {
  return `₹ ${formatNumber(value, digits)} Lakh`;
}

export function formatPct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatRatio(numer: number, denom: number) {
  if (!denom) return "—";
  const ratio = numer / denom;
  if (ratio >= 1) return `${ratio.toFixed(2)}×`;
  return formatPct(ratio * 100, 2);
}

export function formatDateLabel(iso: string) {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatDateTime(iso: string) {
  return iso.replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 19);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seededUnit(seed: number) {
  const x = Math.sin(seed * 9999.11) * 10000;
  return x - Math.floor(x);
}
