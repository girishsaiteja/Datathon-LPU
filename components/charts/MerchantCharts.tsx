"use client";

import { useState } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";

export type CategoryLeak = {
  category: string;
  gmvShare: number;
  cbShare: number;
  leakIndex: number;
};

export function LeakSlopeChart({ data }: { data: CategoryLeak[] }) {
  const [active, setActive] = useState<string | null>(null);
  const rows = data.slice(0, 10);
  if (!rows.length) {
    return <p className="flex h-[320px] items-center justify-center text-[13px] text-slate-400">No category mix to compare.</p>;
  }

  const maxShare = Math.max(8, ...rows.flatMap((row) => [row.gmvShare, row.cbShare]));
  const left = 132;
  const right = 78;
  const top = 28;
  const rowH = 36;
  const width = 760;
  const innerW = width - left - right;
  const height = top + 18 + rowH * rows.length;
  const xOf = (share: number) => left + (share / maxShare) * innerW;

  return (
    <ClientOnly fallback={<div className="h-[320px] w-full rounded-xl bg-slate-50" />}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        <text x={left} y={16} className="fill-sky-600" fontSize="10" fontWeight={700}>
          GMV share
        </text>
        <text x={left + innerW} y={16} className="fill-rose-500" fontSize="10" fontWeight={700} textAnchor="end">
          Chargeback share
        </text>
        {Array.from({ length: 5 }).map((_, i) => {
          const share = (maxShare * i) / 4;
          const x = xOf(share);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={top - 4} y2={height - 14} stroke="#EEF2F7" />
              <text x={x} y={height - 2} textAnchor="middle" fontSize="9" className="fill-slate-400">
                {share.toFixed(0)}%
              </text>
            </g>
          );
        })}
        {rows.map((row, i) => {
          const y = top + 10 + i * rowH;
          const xGmv = xOf(row.gmvShare);
          const xCb = xOf(row.cbShare);
          const leaky = row.cbShare > row.gmvShare + 0.15;
          const color = leaky ? "#E11D48" : row.gmvShare > row.cbShare + 0.15 ? "#0D9488" : "#64748B";
          const dim = active && active !== row.category;
          return (
            <g
              key={row.category}
              opacity={dim ? 0.22 : 1}
              onMouseEnter={() => setActive(row.category)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer"
            >
              <rect x={0} y={y - 14} width={width} height={rowH - 4} fill={active === row.category ? "#F8FAFC" : "transparent"} rx="8" />
              <text x={8} y={y + 4} fontSize="11" fontWeight={700} className="fill-slate-700">
                {row.category.length > 18 ? `${row.category.slice(0, 16)}…` : row.category}
              </text>
              <line x1={xGmv} x2={xCb} y1={y} y2={y} stroke={color} strokeWidth="2.4" />
              <circle cx={xGmv} cy={y} r="5.5" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
              <circle cx={xCb} cy={y} r="5.5" fill={color} stroke="#fff" strokeWidth="2" />
              <text x={width - 8} y={y + 4} textAnchor="end" fontSize="11" fontWeight={800} fill={color}>
                {row.leakIndex >= 1 ? `${row.leakIndex.toFixed(1)}× leak` : `${row.leakIndex.toFixed(1)}×`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> GMV share
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Chargeback share (slopes up = leaky MCC)
        </span>
        {active ? (
          <span className="font-medium text-slate-600">
            {rows.find((row) => row.category === active)?.category}: GMV{" "}
            {rows.find((row) => row.category === active)?.gmvShare.toFixed(1)}% vs chargebacks{" "}
            {rows.find((row) => row.category === active)?.cbShare.toFixed(1)}%
          </span>
        ) : (
          <span>Hover a row — categories over 1.0× contribute more disputes than they earn.</span>
        )}
      </div>
    </ClientOnly>
  );
}
