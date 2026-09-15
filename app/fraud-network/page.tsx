"use client";

import { useMemo, useState } from "react";
import { ClusterHeatmap, ClusterThreatMatrix } from "@/components/charts/ClusterCharts";
import { NetworkGraph } from "@/components/charts/NetworkGraph";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar, SelectField } from "@/components/ui/FilterBar";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { KpiGrid } from "@/components/ui/KpiCard";
import { PageLoader, RefreshingBar } from "@/components/ui/PageLoader";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  MERCHANT_CATEGORIES,
  MIN_TXN_OPTIONS,
  RISK_LEVELS,
} from "@/lib/constants";
import { formatINR, formatLakh, formatNumber, formatRatio } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { useDateRange } from "@/lib/use-date-range";
import type { ClusterRow, FraudFilters, KpiItem, NetworkEdge, NetworkNode } from "@/lib/types";

type FraudResponse = {
  kpis: KpiItem[];
  insights: string[];
  clusters: ClusterRow[];
  selected: ClusterRow;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  highRiskUsers: { userId: string; name: string; disputeCount: number; disputedAmount: number; riskScore: number; kycStatus: string }[];
  highRiskRepeatMerchants: { merchantName: string; category: string; chargebackCount: number; txnCount: number; riskScore: number }[];
};

type Meta = { dateFrom: string; dateTo: string; merchantCategories: string[] };

export default function FraudNetworkPage() {
  const { data: meta } = useApi<Meta>("/api/meta");
  const { date } = useDateRange();
  const [filters, setFilters] = useState<FraudFilters>({
    riskLevel: "All",
    minTransactions: "All",
    merchantCategory: "All",
  });
  const [selectedId, setSelectedId] = useState("");

  const url = useMemo(() => {
    const q = new URLSearchParams({ ...filters, from: date.from, to: date.to });
    return `/api/fraud?${q.toString()}`;
  }, [filters, date]);

  const { data, loading, refreshing, error } = useApi<FraudResponse>(url);
  const selected = data?.clusters.find((c) => c.clusterId === selectedId) ?? data?.selected;

  return (
    <AppShell>
      <div className="px-6 py-5">
        <PageHeader
          title="Fraud Network Analysis"
          subtitle="Suspicious clusters, repeat disputers, and the rings with the hottest chargeback intensity"
        />
        {error ? <p className="mb-3 text-[13px] text-rose-500">{error}</p> : null}
        {refreshing ? <RefreshingBar /> : null}
        {loading && !data ? (
          <PageLoader embedded message="Building the fraud graph and ranking collusive rings." />
        ) : (
        <>
        <FilterBar>
          <SelectField label="Risk Level" value={filters.riskLevel} options={RISK_LEVELS} onChange={(riskLevel) => setFilters((f) => ({ ...f, riskLevel }))} />
          <SelectField
            label="Min Transactions"
            value={filters.minTransactions}
            options={MIN_TXN_OPTIONS}
            onChange={(minTransactions) => setFilters((f) => ({ ...f, minTransactions }))}
          />
          <SelectField
            label="Merchant Category"
            value={filters.merchantCategory}
            options={meta?.merchantCategories ?? [...MERCHANT_CATEGORIES]}
            onChange={(merchantCategory) => setFilters((f) => ({ ...f, merchantCategory }))}
          />
        </FilterBar>

        <KpiGrid items={data?.kpis ?? []} columns={4} />
        <InsightCallout title="Network investigation notes" items={data?.insights ?? []} />

        <div className="mb-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
          <Panel
            className="flex h-full min-h-[500px] flex-col"
            title="Transaction network graph"
            subtitle="Green = merchants, blue = users. Hover a node to light up everyone linked to it."
            extra={
              <div className="hidden gap-3 text-[10px] text-slate-400 lg:flex">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> User</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Merchant</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border-2 border-amber-500" /> Elevated risk</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border-2 border-rose-500" /> High risk ring</span>
              </div>
            }
          >
            <NetworkGraph
              nodes={data?.nodes ?? []}
              edges={data?.edges ?? []}
              onSelect={(id) => {
                const node = data?.nodes.find((n) => n.id === id);
                if (node) setSelectedId(node.clusterId);
              }}
            />
          </Panel>
          <Panel className="flex h-full min-h-[500px] flex-col" title="Selected cluster" subtitle="Highest-risk ring unless you pick another">
            {selected ? (
              <div className="flex flex-1 flex-col gap-2">
                <Row label="Cluster ID" value={selected.clusterId} />
                <Row label="Users" value={formatNumber(selected.users)} />
                <Row label="Merchants" value={formatNumber(selected.merchants)} />
                <Row label="Transactions" value={formatNumber(selected.transactions)} />
                <Row label="Chargebacks" value={formatNumber(selected.chargebacks)} />
                <Row label="Amount" value={formatLakh(selected.amountLakh)} />
                <Row label="Risk score" value={String(selected.riskScore)} accent />
              </div>
            ) : (
              <p className="flex flex-1 items-center text-[13px] text-slate-400">No cluster selected.</p>
            )}
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="High-risk users with repeated disputes" subtitle="Two or more disputes — first queue for account freeze">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">User</th>
                  <th className="pb-2 font-semibold">KYC</th>
                  <th className="pb-2 font-semibold">Disputes</th>
                  <th className="pb-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.highRiskUsers ?? []).map((row) => (
                  <tr key={row.userId} className="border-t border-slate-100">
                    <td className="py-2.5">
                      <p className="font-semibold text-slate-700">{row.name}</p>
                      <p className="text-[11px] text-slate-400">{row.userId}</p>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={row.kycStatus} />
                    </td>
                    <td className="py-2.5 font-semibold text-rose-500">{formatNumber(row.disputeCount)}</td>
                    <td className="py-2.5 font-semibold">{formatINR(row.disputedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="High-risk merchants with repeated disputes" subtitle="High/Critical merchants with 2+ chargebacks">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Merchant</th>
                  <th className="pb-2 font-semibold">CBs / Txns</th>
                  <th className="pb-2 font-semibold">Ratio</th>
                  <th className="pb-2 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {(data?.highRiskRepeatMerchants ?? []).map((row) => (
                  <tr key={row.merchantName} className="border-t border-slate-100">
                    <td className="py-2.5">
                      <p className="font-semibold text-slate-700">{row.merchantName}</p>
                      <p className="text-[11px] text-slate-400">{row.category}</p>
                    </td>
                    <td className="py-2.5 text-rose-500">
                      {formatNumber(row.chargebackCount)} / {formatNumber(row.txnCount)}
                    </td>
                    <td className="py-2.5 font-semibold text-amber-600">{formatRatio(row.chargebackCount, row.txnCount)}</td>
                    <td className="py-2.5 font-bold text-rose-500">{row.riskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel
            title="Cluster threat matrix"
            subtitle="X = chargebacks, Y = risk score, bubble size = transactions. Click a ring to lock it in the network pane."
          >
            <ClusterThreatMatrix
              data={data?.clusters ?? []}
              selectedId={selected?.clusterId}
              onSelect={setSelectedId}
            />
          </Panel>
          <Panel
            title="Cluster intensity heatmap"
            subtitle="Darker cells are hotter versus the other rings on this page. Click a row to inspect that cluster."
          >
            <ClusterHeatmap data={data?.clusters ?? []} selectedId={selected?.clusterId} onSelect={setSelectedId} />
          </Panel>
        </div>
        </>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="grid min-h-[48px] flex-1 grid-cols-[minmax(0,1fr)_minmax(6.5rem,auto)] items-center gap-3 rounded-xl bg-slate-50 px-4">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className={`whitespace-nowrap text-right text-[13px] font-semibold tabular-nums ${accent ? "text-rose-500" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}
