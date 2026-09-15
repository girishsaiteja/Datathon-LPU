"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";
import type { ChartSpec } from "@/lib/agent/types";

const COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6"];

function downsample(data: ChartSpec["data"], max = 90) {
  if (data.length <= max) return data;
  const step = Math.ceil(data.length / max);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

export function DynamicChart({ spec }: { spec: ChartSpec }) {
  const chartData = spec.type === "line" ? downsample(spec.data) : spec.data.slice(0, 24);
  const scatterY = spec.series[0]?.key;
  const pieKey = spec.series[0]?.key;
  const pieData = pieKey
    ? chartData.map((row, i) => ({
        name: String(row[spec.xKey] ?? ""),
        value: Number(row[pieKey] || 0),
        fill: COLORS[i % COLORS.length],
      }))
    : [];

  return (
    <ClientOnly fallback={<div className="h-[240px] rounded-xl bg-slate-50" />}>
      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "pie" && pieKey ? (
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                {pieData.map((slice) => (
                  <Cell key={slice.name} fill={slice.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : spec.type === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid stroke="#E8EEF5" vertical={false} />
              <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {spec.series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.3}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : spec.type === "scatter" && scatterY ? (
            <ScatterChart>
              <CartesianGrid stroke="#E8EEF5" />
              <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} name={spec.xKey} type="number" />
              <YAxis dataKey={scatterY} tick={{ fontSize: 10 }} name={spec.series[0]?.label} type="number" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={spec.data} fill="#3B82F6" name={spec.series[0]?.label} />
            </ScatterChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid stroke="#E8EEF5" vertical={false} />
              <XAxis
                dataKey={spec.xKey}
                tick={{ fontSize: 10 }}
                interval={0}
                angle={chartData.length > 8 ? -25 : 0}
                height={chartData.length > 8 ? 70 : 30}
                textAnchor={chartData.length > 8 ? "end" : "middle"}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {spec.series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}
