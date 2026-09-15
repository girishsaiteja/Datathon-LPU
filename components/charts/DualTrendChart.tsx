"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";

function downsample<T>(data: T[], max = 90): T[] {
  if (data.length <= max) return data;
  const step = Math.ceil(data.length / max);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

export function DualTrendChart({
  data,
  barKey,
  lineKey,
  barName,
  lineName,
  barColor,
  lineColor,
  height = 268,
  xKey = "date",
}: {
  data: Record<string, string | number>[];
  barKey: string;
  lineKey: string;
  barName: string;
  lineName: string;
  barColor: string;
  lineColor: string;
  height?: number;
  xKey?: string;
}) {
  const gid = `${barKey}-${lineKey}`;
  const chartData = downsample(data);
  return (
    <div className="w-full" style={{ height }}>
      <ClientOnly fallback={<div className="h-full w-full rounded-xl bg-slate-50" />}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={`bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity={0.95} />
                <stop offset="100%" stopColor={barColor} stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id={`line-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E8EEF5" vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 14, fontSize: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,35,70,0.08)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey={barKey} name={barName} fill={`url(#bar-${gid})`} radius={[4, 4, 0, 0]} barSize={7} />
            <Area yAxisId="right" type="monotone" dataKey={lineKey} name={lineName} stroke={lineColor} fill={`url(#line-${gid})`} strokeWidth={2.4} />
          </ComposedChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}
