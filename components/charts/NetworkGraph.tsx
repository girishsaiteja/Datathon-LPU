"use client";

import { useMemo, useState } from "react";
import type { NetworkEdge, NetworkNode } from "@/lib/types";

const VIEW_W = 720;
const VIEW_H = 460;
const CX = 360;
const CY = 236;

function isMerchant(node: NetworkNode) {
  return node.id.startsWith("MCH") || node.type === "merchant";
}

function fillFor(node: NetworkNode) {
  if (isMerchant(node)) return "#10B981";
  return "#38BDF8";
}

function ringFor(node: NetworkNode) {
  if (node.riskScore >= 90 || node.type === "high-risk") return "#F43F5E";
  if (node.riskScore >= 75 || node.type === "suspicious") return "#F59E0B";
  return "#ffffff";
}

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(36, len * 0.18);
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function layoutStar(nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] {
  if (!nodes.length) return nodes;
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const hub = [...nodes].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))[0];
  const others = nodes.filter((n) => n.id !== hub.id);
  const n = others.length;
  const ringR = Math.min(168, Math.max(124, 42 + n * 6.8));

  return [
    { ...hub, x: CX, y: CY, r: Math.max(hub.r, 15) },
    ...others.map((node, i) => {
      const angle = -Math.PI / 2 + ((i + 0.5) / Math.max(n, 1)) * Math.PI * 2;
      return {
        ...node,
        x: CX + Math.cos(angle) * ringR,
        y: CY + Math.sin(angle) * ringR,
        r: isMerchant(node) ? 11 : 9,
      };
    }),
  ];
}

type LabelBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  anchor: "start" | "middle" | "end";
  ux: number;
  uy: number;
};

function labelWidth(text: string) {
  return Math.max(40, text.length * 6.35);
}

function bounds(label: LabelBox) {
  const left = label.anchor === "end" ? label.x - label.w : label.anchor === "middle" ? label.x - label.w / 2 : label.x;
  return { left, top: label.y - 10, right: left + label.w, bottom: label.y + 4 };
}

function layoutLabels(nodes: NetworkNode[]): Record<string, LabelBox> {
  const hub = nodes.reduce((best, node) => {
    const d = Math.hypot(node.x - CX, node.y - CY);
    const bd = Math.hypot(best.x - CX, best.y - CY);
    return d < bd ? node : best;
  }, nodes[0]);

  const items: LabelBox[] = nodes.map((node, i) => {
    const w = labelWidth(node.label);
    if (node.id === hub.id) {
      return { id: node.id, x: node.x, y: node.y - node.r - 14, w, h: 14, anchor: "middle", ux: 0, uy: -1 };
    }
    const dx = node.x - CX;
    const dy = node.y - CY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const extra = i % 2 === 0 ? 12 : 28;
    const radius = dist + extra;
    const anchor: LabelBox["anchor"] = ux > 0.42 ? "start" : ux < -0.42 ? "end" : "middle";
    return {
      id: node.id,
      x: CX + ux * radius,
      y: CY + uy * radius + (anchor === "middle" ? (uy > 0 ? 4 : 0) : 3),
      w,
      h: 14,
      anchor,
      ux,
      uy,
    };
  });

  for (let pass = 0; pass < 16; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const A = bounds(a);
        const B = bounds(b);
        const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (overlapX <= 3 || overlapY <= 3) continue;
        a.x += a.ux * 6;
        a.y += a.uy * 6;
        b.x += b.ux * 6;
        b.y += b.uy * 6;
        const sepY = Math.sign(a.y - b.y) || 1;
        a.y += sepY * Math.max(4, overlapY / 2);
        b.y -= sepY * Math.max(4, overlapY / 2);
      }
    }
  }

  for (const label of items) {
    const pad = 8;
    if (label.anchor === "start") {
      label.x = Math.min(VIEW_W - pad - 4, Math.max(pad, label.x));
    } else if (label.anchor === "end") {
      label.x = Math.min(VIEW_W - pad, Math.max(pad + label.w, label.x));
    } else {
      label.x = Math.min(VIEW_W - label.w / 2 - pad, Math.max(label.w / 2 + pad, label.x));
    }
    label.y = Math.min(VIEW_H - 10, Math.max(14, label.y));
  }

  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export function NetworkGraph({
  nodes,
  edges,
  onSelect,
}: {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onSelect?: (id: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const placed = useMemo(() => layoutStar(nodes, edges), [nodes, edges]);
  const labels = useMemo(() => layoutLabels(placed), [placed]);
  const nodeMap = useMemo(() => Object.fromEntries(placed.map((n) => [n.id, n])), [placed]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    }
    return map;
  }, [edges]);

  const linked = useMemo(() => {
    if (!hover) return null;
    return new Set([hover, ...(neighbors.get(hover) ?? [])]);
  }, [hover, neighbors]);

  const hovered = hover ? nodeMap[hover] : null;
  const linkedCount = hover ? (neighbors.get(hover)?.size ?? 0) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#f3f7fc]">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-[440px] w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="graph-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#d5e3f2" />
          </pattern>
          <radialGradient id="graph-glow" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#f3f7fc" stopOpacity="0" />
          </radialGradient>
          <filter id="link-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2.2" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="url(#graph-dots)" />
        <rect width={VIEW_W} height={VIEW_H} fill="url(#graph-glow)" />

        {edges.map((edge, i) => {
          const s = nodeMap[edge.source];
          const t = nodeMap[edge.target];
          if (!s || !t) return null;
          const active = Boolean(hover && (edge.source === hover || edge.target === hover));
          const dim = Boolean(hover && !active);
          const stroke = active ? "#2563EB" : edge.risk === "high" ? "#FB7185" : edge.risk === "medium" ? "#FBBF24" : "#93C5FD";
          return (
            <path
              key={`${edge.source}-${edge.target}-${i}`}
              d={curvePath(s.x, s.y, t.x, t.y)}
              fill="none"
              stroke={stroke}
              strokeWidth={active ? 3.2 : 1.5}
              strokeOpacity={dim ? 0.08 : active ? 1 : 0.7}
              filter={active ? "url(#link-glow)" : undefined}
              className="pointer-events-none"
            />
          );
        })}

        {placed.map((node) => {
          const inFocus = !linked || linked.has(node.id);
          const isHover = hover === node.id;
          const connected = Boolean(linked?.has(node.id) && !isHover);
          const showLabel = !hover || inFocus;
          const r = isHover ? node.r + 5 : connected ? node.r + 2 : node.r;
          const label = labels[node.id];
          const box = label ? bounds(label) : null;
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              opacity={inFocus ? 1 : 0.14}
              filter={isHover || connected ? "url(#node-glow)" : undefined}
              onMouseOver={() => setHover(node.id)}
              onMouseOut={() => setHover(null)}
              onClick={() => onSelect?.(node.id)}
            >
              {isHover ? (
                <circle cx={node.x} cy={node.y} r={r + 8} fill={fillFor(node)} fillOpacity="0.16" />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={fillFor(node)}
                stroke={isHover ? "#0F172A" : ringFor(node)}
                strokeWidth={isHover ? 3 : ringFor(node) === "#ffffff" ? 2 : 3}
              />
              {showLabel && label && box ? (
                <>
                  <rect
                    x={box.left - 4}
                    y={box.top - 1}
                    width={label.w + 8}
                    height={label.h + 2}
                    rx={4}
                    fill="#f8fbff"
                    fillOpacity={isHover ? 0.98 : 0.92}
                    stroke="#e2e8f0"
                    strokeWidth="0.8"
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    fontSize={isHover ? 11 : 10}
                    fontWeight={isHover ? 800 : 650}
                    fill={isHover ? "#0F172A" : "#334155"}
                  >
                    {node.label}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hovered ? (
        <div className="absolute right-3 top-3 min-w-[160px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] shadow-card backdrop-blur">
          <div className="font-bold text-slate-800">{hovered.label}</div>
          <div className="capitalize text-slate-500">{isMerchant(hovered) ? "Merchant" : "User"}</div>
          <div className="text-slate-500">Risk score {hovered.riskScore}</div>
          <div className="mt-1 font-semibold text-brand-600">
            {linkedCount} linked {linkedCount === 1 ? "node" : "nodes"}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/80 px-2.5 py-1 text-[10px] text-slate-400">
          Hover a node to highlight everyone connected to it
        </div>
      )}
    </div>
  );
}
