"use client";

import { useState } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import type { SpikeRoseSlice } from "@/lib/types";

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function petalPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
  const a = polar(cx, cy, inner, start);
  const b = polar(cx, cy, outer, start);
  const c = polar(cx, cy, outer, end);
  const d = polar(cx, cy, inner, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} A ${outer} ${outer} 0 ${large} 1 ${c.x} ${c.y} L ${d.x} ${d.y} A ${inner} ${inner} 0 ${large} 0 ${a.x} ${a.y} Z`;
}

function mixColor(t: number) {
  const from = [253, 186, 116];
  const to = [244, 63, 94];
  const n = Math.min(1, Math.max(0, t));
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * n));
  return `rgb(${rgb.join(",")})`;
}

export function CoxcombChart({ data }: { data: SpikeRoseSlice[] }) {
  const [active, setActive] = useState<string | null>(null);
  const named = data.filter((row) => row.spikes > 0 && row.name !== "Others").slice(0, 8);
  const others = data.find((row) => row.name === "Others");
  const slices = named.length ? named : data.filter((row) => row.spikes > 0).slice(0, 8);
  if (!slices.length) {
    return <p className="flex h-[320px] items-center justify-center text-[13px] text-slate-400">No category shock mix to plot.</p>;
  }

  const max = Math.max(...slices.map((row) => row.spikes));
  const maxFactor = Math.max(...slices.map((row) => row.avgFactor), 1);
  const size = 320;
  const cx = 160;
  const cy = 156;
  const inner = 36;
  const maxR = 122;
  const step = (Math.PI * 2) / slices.length;
  const startAt = -Math.PI / 2;
  const total = slices.reduce((sum, row) => sum + row.spikes, 0);
  const activeSlice = slices.find((row) => row.name === active);

  return (
    <ClientOnly fallback={<div className="h-[320px] w-full rounded-xl bg-slate-50" />}>
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 lg:flex-row">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-[280px] w-[280px] shrink-0" role="img">
          {Array.from({ length: 3 }).map((_, i) => (
            <circle key={i} cx={cx} cy={cy} r={inner + ((maxR - inner) * (i + 1)) / 3} fill="none" stroke="#E8EEF5" />
          ))}
          {slices.map((row, i) => {
            const start = startAt + i * step + 0.012;
            const end = startAt + (i + 1) * step - 0.012;
            const outer = inner + 28 + (maxR - inner - 28) * Math.sqrt(row.spikes / max);
            const color = mixColor((row.avgFactor - 1) / Math.max(0.2, maxFactor - 1));
            const dim = active && active !== row.name;
            return (
              <path
                key={row.name}
                d={petalPath(cx, cy, inner, outer, start, end)}
                fill={color}
                stroke="#fff"
                strokeWidth="2"
                opacity={dim ? 0.28 : 1}
                onMouseEnter={() => setActive(row.name)}
                onMouseLeave={() => setActive(null)}
                className="cursor-pointer"
              />
            );
          })}
          <circle cx={cx} cy={cy} r={inner - 2} fill="#fff" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight={800} className="fill-slate-800">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" className="fill-slate-400">
            SHOCKS
          </text>
        </svg>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
          {slices.map((row) => (
            <button
              key={row.name}
              type="button"
              onMouseEnter={() => setActive(row.name)}
              onMouseLeave={() => setActive(null)}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] ${
                active === row.name ? "bg-slate-50" : ""
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: mixColor((row.avgFactor - 1) / Math.max(0.2, maxFactor - 1)) }} />
              <span className="truncate font-medium text-slate-600">{row.name}</span>
              <span className="whitespace-nowrap font-semibold tabular-nums text-slate-700">
                {row.spikes}
                <span className="ml-1 font-medium text-slate-400">{row.avgFactor.toFixed(1)}×</span>
              </span>
            </button>
          ))}
          {activeSlice ? (
            <p className="mt-1 text-[11px] text-slate-400">
              {activeSlice.name}: {activeSlice.spikes} merchants shocked, avg {activeSlice.avgFactor.toFixed(1)}× daily volume, {activeSlice.chargebacks} chargebacks already booked.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-400">
              Nightingale rose: equal angles, radius = shocked merchants
              {others ? `. ${others.spikes} uncategorised shocks are held out so named MCCs stay comparable.` : "."}
            </p>
          )}
        </div>
      </div>
    </ClientOnly>
  );
}
