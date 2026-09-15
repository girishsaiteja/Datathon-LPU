"use client";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from "@/lib/constants";
import type { DateRange } from "@/lib/types";

function toIso(min: string, offset: number) {
  return format(addDays(parseISO(min), offset), "yyyy-MM-dd");
}

function toOffset(min: string, iso: string, span: number) {
  return Math.max(0, Math.min(span, differenceInCalendarDays(parseISO(iso), parseISO(min))));
}

function shortDate(iso: string) {
  return format(parseISO(iso), "d MMM");
}

export function DateRangeSlider({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
}) {
  const min = DEFAULT_DATE_FROM;
  const max = DEFAULT_DATE_TO;
  const span = Math.max(1, differenceInCalendarDays(parseISO(max), parseISO(min)));
  const [fromI, setFromI] = useState(() => toOffset(min, value.from, span));
  const [toI, setToI] = useState(() => toOffset(min, value.to, span));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFromI(toOffset(min, value.from, span));
    setToI(toOffset(min, value.to, span));
  }, [value.from, value.to, min, span]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function commit(nextFrom: number, nextTo: number) {
    let start = Math.round(nextFrom);
    let end = Math.round(nextTo);
    if (start > end) [start, end] = [end, start];
    start = Math.max(0, Math.min(span, start));
    end = Math.max(0, Math.min(span, end));
    setFromI(start);
    setToI(end);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = { from: toIso(min, start), to: toIso(min, end) };
      if (next.from !== value.from || next.to !== value.to) onChange(next);
    }, 280);
  }

  const left = (fromI / span) * 100;
  const width = ((toI - fromI) / span) * 100;

  return (
    <div className="w-[280px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-700">
        <span className="tabular-nums">{shortDate(toIso(min, fromI))}</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Range</span>
        <span className="tabular-nums">{shortDate(toIso(min, toI))}</span>
      </div>
      <div className="date-range-slider relative mx-1 h-6">
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
        />
        <input
          type="range"
          min={0}
          max={span}
          step={1}
          value={fromI}
          onChange={(e) => commit(Number(e.target.value), toI)}
          aria-label="Range start"
        />
        <input
          type="range"
          min={0}
          max={span}
          step={1}
          value={toI}
          onChange={(e) => commit(fromI, Number(e.target.value))}
          aria-label="Range end"
        />
      </div>
    </div>
  );
}
