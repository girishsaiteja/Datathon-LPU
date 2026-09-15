"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { formatNumber } from "@/lib/format";

type Slice = { name: string; value: number; color: string };

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  layout = "stack",
  columns,
}: {
  data: Slice[];
  centerValue: string | number;
  centerLabel?: string;
  layout?: "stack" | "split";
  columns?: 1 | 2;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const split = layout === "split";
  const size = split ? 210 : 176;
  const inner = split ? 64 : 54;
  const outer = split ? 94 : 80;
  const cols = columns ?? (split ? 1 : 2);

  return (
    <div
      className={
        split
          ? "flex w-full min-w-0 items-center gap-6"
          : "flex w-full min-w-0 flex-col items-center gap-5"
      }
    >
      <div className="relative shrink-0 overflow-visible" style={{ height: size, width: size }}>
        <ClientOnly fallback={<div className="h-full w-full rounded-full bg-slate-100" />}>
          <PieChart width={size} height={size} style={{ display: "block" }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name)]}
              contentStyle={{ borderRadius: 14, fontSize: 12, border: "1px solid #e2e8f0" }}
            />
          </PieChart>
        </ClientOnly>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-extrabold leading-none text-slate-800 ${split ? "text-[22px]" : "text-[18px]"}`}>{centerValue}</div>
          {centerLabel ? <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</div> : null}
        </div>
      </div>

      <ul className={`grid min-w-0 flex-1 gap-2 ${cols === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {data.map((slice) => (
          <li
            key={slice.name}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-[12px]"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="min-w-0 font-medium leading-snug text-slate-600">{slice.name}</span>
            <span className="whitespace-nowrap text-right font-semibold tabular-nums text-slate-700">
              {formatNumber(slice.value)}
              <span className="ml-2 font-medium text-slate-400">{total ? `${((slice.value / total) * 100).toFixed(0)}%` : "0%"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
