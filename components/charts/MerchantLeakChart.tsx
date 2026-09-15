"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ClientOnly } from "@/components/ui/ClientOnly";
import type { MerchantLeakPoint } from "@/lib/types";

function fillFor(row: MerchantLeakPoint) {
  if (row.riskScore >= 90) return "#F43F5E";
  if (row.ratio >= 0.2) return "#F97316";
  if (row.ratio >= 0.08) return "#F59E0B";
  return "#2f6bff";
}

export function MerchantLeakChart({ data }: { data: MerchantLeakPoint[] }) {
  const rows = data.slice(0, 50);
  const midX = rows.length ? rows.reduce((s, r) => s + r.amountCr, 0) / rows.length : 0;
  const midY = rows.length ? rows.reduce((s, r) => s + r.ratioPct, 0) / rows.length : 0;

  if (!rows.length) {
    return <p className="flex h-[320px] items-center justify-center text-[13px] text-slate-400">No merchants in this date window.</p>;
  }

  return (
    <div className="h-[320px] w-full">
      <ClientOnly fallback={<div className="h-full w-full rounded-xl bg-slate-50" />}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#E8EEF5" strokeDasharray="3 6" />
            <XAxis
              type="number"
              dataKey="amountCr"
              name="GMV"
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              label={{ value: "GMV (₹ Cr)", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94A3B8" }}
            />
            <YAxis
              type="number"
              dataKey="ratioPct"
              name="CB rate"
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              width={42}
              label={{ value: "CB %", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94A3B8" }}
            />
            <ZAxis type="number" dataKey="disputed" range={[60, 280]} />
            {midX > 0 ? <ReferenceLine x={midX} stroke="#CBD5E1" strokeDasharray="4 4" /> : null}
            {midY > 0 ? <ReferenceLine y={midY} stroke="#CBD5E1" strokeDasharray="4 4" /> : null}
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ payload }) => {
                const row = payload?.[0]?.payload as MerchantLeakPoint | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-sm">
                    <p className="font-semibold text-slate-800">{row.merchantName}</p>
                    <p className="text-slate-500">{row.category}</p>
                    <p className="mt-1 text-slate-700">
                      GMV ₹ {row.amountCr.toFixed(2)} Cr · {row.txns} txns
                    </p>
                    <p className="font-semibold text-rose-500">
                      {row.chargebacks} CBs · {row.ratioPct.toFixed(1)}% leak
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={rows}
              shape={(props: { cx?: number; cy?: number; payload?: MerchantLeakPoint }) => {
                const { cx = 0, cy = 0, payload } = props;
                const r = payload && payload.ratioPct > midY && payload.amountCr > midX ? 9 : 6;
                return (
                  <circle cx={cx} cy={cy} r={r} fill={payload ? fillFor(payload) : "#94A3B8"} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ClientOnly>
      <div className="mt-1 grid grid-cols-2 gap-x-4 text-[10px] text-slate-400 sm:grid-cols-4">
        <span>Cash cows — high GMV, low leak</span>
        <span className="text-rose-400">Watchlist — high GMV, high leak</span>
        <span>Quiet — low GMV, low leak</span>
        <span className="text-amber-500">Minnows — low GMV, high leak</span>
      </div>
    </div>
  );
}
