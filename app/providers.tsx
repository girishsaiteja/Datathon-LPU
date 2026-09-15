"use client";

import { DateRangeProvider } from "@/lib/use-date-range";
import type { DateRange } from "@/lib/types";

export function Providers({
  children,
  initialDate,
}: {
  children: React.ReactNode;
  initialDate?: DateRange;
}) {
  return <DateRangeProvider initialDate={initialDate}>{children}</DateRangeProvider>;
}
