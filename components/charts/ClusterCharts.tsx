"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";
import type { ClusterRow } from "@/lib/types";

function riskFill(score: number) {
  if (score >= 90) return "#F43F5E";
  if (score >= 75) return "#F97316";
  return "#F59E0B";
}

function heat(value: number, max: number) {
  const t = max ? Math.min(1, value / max) : 0;
  const r = Math.round(254 - t * 80);
  const g = Math.round(242 - t * 200);
  const b = Math.round(242 - t * 148);
  return `rgb(${r},${g},${b})`;
}

export function ClusterThreatMatrix({
  data,
  selectedId,
  onSelect,
}: {
  data: ClusterRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const rows = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        x: row.chargebacks,
        y: row.riskScore,
        z: Math.max(8, row.transactions),
      })),
    [data],
  );

  if (!rows.length) {
    return <p className="flex h-[300px] items-center justify-center text-[13px] text-slate-400">No clusters in this cut.</p>;
  }

  return (
    <div className="h-[300px] w-full">
      <ClientOnly fallback={<div className="h-full w-full rounded-xl bg-slate-50" />}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 36, left: 8, bottom: 12 }}>
            <CartesianGrid stroke="#E8EEF5" strokeDasharray="3 6" />
            <XAxis
              type="number"
              dataKey="x"
              name="Chargebacks"
              domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.2))]}
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              label={{ value: "Chargebacks", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94A3B8" }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Risk"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{ value: "Risk", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94A3B8" }}
            />
            <ZAxis type="number" dataKey="z" range={[80, 280]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ payload }) => {
                const row = payload?.[0]?.payload as ClusterRow | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-sm">
                    <p className="font-semibold text-slate-800">{row.clusterId}</p>
                    <p className="text-slate-500">
                      {row.users} users · {row.merchants} merchants · {row.transactions} txns
                    </p>
                    <p className="mt-1 font-semibold text-rose-500">{row.chargebacks} chargebacks</p>
                    <p className="font-semibold text-slate-700">Risk {row.riskScore}</p>
                  </div>
                );
              }}
            />
            <Scatter
              data={rows}
              onClick={(item) => {
                const id = (item as { clusterId?: string }).clusterId;
                if (id) onSelect?.(id);
              }}
              shape={(props: { cx?: number; cy?: number; payload?: ClusterRow }) => {
                const { cx = 0, cy = 0, payload } = props;
                const selected = payload?.clusterId === selectedId;
                const r = selected ? 11 : 8;
                const maxX = Math.max(...rows.map((row) => row.x), 1);
                const labelLeft = (payload?.chargebacks ?? 0) >= maxX * 0.72;
                return (
                  <g className="cursor-pointer">
                    {selected ? (
                      <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#2f6bff" strokeWidth={2} />
                    ) : null}
                    <circle cx={cx} cy={cy} r={r} fill={riskFill(payload?.riskScore ?? 0)} stroke="#fff" strokeWidth={2} />
                    <text
                      x={labelLeft ? cx - 12 : cx + 12}
                      y={cy + 4}
                      fontSize="10"
                      fill="#334155"
                      fontWeight={700}
                      textAnchor={labelLeft ? "end" : "start"}
                    >
                      {payload?.clusterId}
                    </text>
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}

const HEAT_KEYS = [
  { key: "users" as const, label: "Users" },
  { key: "merchants" as const, label: "Merchants" },
  { key: "transactions" as const, label: "Txns" },
  { key: "chargebacks" as const, label: "CBs" },
  { key: "amountLakh" as const, label: "₹ Lakh" },
  { key: "riskScore" as const, label: "Risk" },
];

export function ClusterHeatmap({
  data,
  selectedId,
  onSelect,
}: {
  data: ClusterRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = data.slice(0, 8);
  const max: Record<(typeof HEAT_KEYS)[number]["key"], number> = {
    users: Math.max(1, ...rows.map((r) => r.users)),
    merchants: Math.max(1, ...rows.map((r) => r.merchants)),
    transactions: Math.max(1, ...rows.map((r) => r.transactions)),
    chargebacks: Math.max(1, ...rows.map((r) => r.chargebacks)),
    amountLakh: Math.max(1, ...rows.map((r) => r.amountLakh)),
    riskScore: 100,
  };

  if (!rows.length) {
    return <p className="flex h-[300px] items-center justify-center text-[13px] text-slate-400">No cluster intensity to plot.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11px]">
        <thead>
          <tr>
            <th className="pb-1 text-left font-semibold uppercase tracking-wide text-slate-400">Cluster</th>
            {HEAT_KEYS.map((col) => (
              <th key={col.key} className="pb-1 text-center font-semibold uppercase tracking-wide text-slate-400">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = row.clusterId === selectedId || row.clusterId === hover;
            return (
              <tr
                key={row.clusterId}
                className="cursor-pointer"
                onMouseEnter={() => setHover(row.clusterId)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(row.clusterId)}
              >
                <td className={`rounded-lg px-2 py-1.5 font-bold ${active ? "text-brand-600" : "text-slate-700"}`}>{row.clusterId}</td>
                {HEAT_KEYS.map((col) => {
                  const value = row[col.key];
                  const intense = value / max[col.key] > 0.55;
                  return (
                    <td key={col.key} className="p-0">
                      <div
                        className="rounded-lg px-2 py-2 text-center font-semibold tabular-nums"
                        style={{ background: heat(value, max[col.key]), color: intense ? "#fff" : "#334155" }}
                      >
                        {col.key === "amountLakh" ? value.toFixed(1) : Math.round(value)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
