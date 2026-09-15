"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";

export function VerticalBarChart({
  data,
  xKey,
  yKey,
  name,
  color = "#3B82F6",
  height = 268,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  name: string;
  color?: string;
  height?: number;
}) {
  const gid = `vbar-${yKey}`;
  return (
    <div className="w-full" style={{ height }}>
      <ClientOnly fallback={<div className="h-full w-full rounded-xl bg-slate-50" />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E8EEF5" vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 14, fontSize: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,35,70,0.08)" }}
            />
            <Bar dataKey={yKey} name={name} fill={`url(#${gid})`} radius={[5, 5, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}
