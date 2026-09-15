"use client";

import { DateRangeSlider } from "@/components/ui/DateRangeSlider";
import { useDateRange } from "@/lib/use-date-range";

export function PageHeader({
  title,
  subtitle,
  onDateChange,
}: {
  title: string;
  subtitle: string;
  onDateChange?: () => void;
}) {
  const { date, setDate } = useDateRange();

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold tracking-tight text-slate-800">{title}</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
      </div>
      <DateRangeSlider
        value={date}
        onChange={(next) => {
          setDate(next);
          onDateChange?.();
        }}
      />
    </div>
  );
}
