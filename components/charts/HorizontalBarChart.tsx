"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";

export function HorizontalBarChart({
  data,
  color = "#3B82F6",
  suffix = "",
  max,
}: {
  data: { name: string; value: number }[];
  color?: string;
  suffix?: string;
  max?: number;
}) {
  return (
    <div className="h-[280px] w-full">
      <ClientOnly fallback={<div className="h-full w-full rounded-xl bg-slate-50" />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 36, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#E8EEF5" horizontal={false} strokeDasharray="3 6" />
            <XAxis type="number" hide domain={[0, max ?? "auto"]} />
            <YAxis type="category" dataKey="name" width={128} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${Number(value ?? 0).toFixed(2)}${suffix}`, "Value"]}
              contentStyle={{ borderRadius: 14, fontSize: 12, border: "1px solid #e2e8f0" }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={i === 0 ? color : `${color}CC`} opacity={1 - i * 0.06} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                formatter={(value: number | string) => `${Number(value ?? 0)}${suffix}`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}
