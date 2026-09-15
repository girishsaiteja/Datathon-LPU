"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

export function TrendLineChart({
  data,
  xKey = "date",
  series,
  height = 268,
}: {
  data: Record<string, string | number>[];
  xKey?: string;
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  const chartData = downsample(data);
  return (
    <div className="w-full" style={{ height }}>
      <ClientOnly fallback={<div className="h-full w-full rounded-xl bg-slate-50" />}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#E8EEF5" vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,35,70,0.08)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}
