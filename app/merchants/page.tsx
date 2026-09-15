"use client";

import { useMemo, useState } from "react";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { CoxcombChart } from "@/components/charts/BurstCharts";
import { LeakSlopeChart } from "@/components/charts/MerchantCharts";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar, SelectField } from "@/components/ui/FilterBar";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { KpiGrid } from "@/components/ui/KpiCard";
import { PageLoader, RefreshingBar } from "@/components/ui/PageLoader";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  BUSINESS_TYPES,
  MERCHANT_CATEGORIES,
  MERCHANT_STATES,
  MERCHANT_STATUSES,
  RISK_LEVELS,
} from "@/lib/constants";
import { formatCrore, formatINR, formatNumber, formatRatio } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { useDateRange } from "@/lib/use-date-range";
import type { KpiItem, MerchantFilters, MerchantRow, SpikeRoseSlice } from "@/lib/types";

type MerchantResponse = {
  kpis: KpiItem[];
  insights: string[];
  amountByCategory: { name: string; value: number }[];
  ratioByCategory: { name: string; value: number }[];
  topByChargeback: MerchantRow[];
  topByDisputed: {
    merchantId: string;
    merchantName: string;
    category: string;
    disputedAmount: number;
    chargebackCount: number;
    txnCount: number;
  }[];
  highRiskMerchants: { merchantName: string; category: string; riskScore: number; chargebackCount: number; txnCount: number }[];
  categoryPerformance: { category: string; txns: number; amount: number; chargebacks: number; disputed: number; ratio: number }[];
  categoryLeak: { category: string; gmvShare: number; cbShare: number; leakIndex: number }[];
  spikeRose: SpikeRoseSlice[];
};

type Meta = { dateFrom: string; dateTo: string; merchantCategories: string[]; merchantStates: string[] };

export default function MerchantAnalysisPage() {
  const { data: meta } = useApi<Meta>("/api/meta");
  const { date } = useDateRange();
  const [filters, setFilters] = useState<MerchantFilters>({
    merchantState: "All",
    merchantCategory: "All",
    businessType: "All",
    merchantStatus: "All",
    riskLevel: "All",
  });

  const url = useMemo(() => {
    const q = new URLSearchParams({ ...filters, from: date.from, to: date.to });
    return `/api/merchants?${q.toString()}`;
  }, [filters, date]);

  const { data, loading, refreshing, error } = useApi<MerchantResponse>(url);
  const firstLoad = loading && !data;

  return (
    <AppShell>
      <div className="px-6 py-5">
        <PageHeader
          title="Merchant Analysis"
          subtitle="Category performance, chargeback concentration, and where GMV and disputes diverge"
        />
        {error ? <p className="mb-3 text-[13px] text-rose-500">{error}</p> : null}
        {refreshing ? <RefreshingBar /> : null}
        {firstLoad ? (
          <PageLoader embedded message="Scoring merchants, category leak and chargeback concentration." />
        ) : (
        <>
        <FilterBar>
          <SelectField
            label="State"
            value={filters.merchantState}
            options={meta?.merchantStates ?? [...MERCHANT_STATES]}
            onChange={(merchantState) => setFilters((f) => ({ ...f, merchantState }))}
          />
          <SelectField
            label="Merchant Category"
            value={filters.merchantCategory}
            options={meta?.merchantCategories ?? [...MERCHANT_CATEGORIES]}
            onChange={(merchantCategory) => setFilters((f) => ({ ...f, merchantCategory }))}
          />
          <SelectField
            label="Business Type"
            value={filters.businessType}
            options={BUSINESS_TYPES}
            onChange={(businessType) => setFilters((f) => ({ ...f, businessType }))}
          />
          <SelectField
            label="Merchant Status"
            value={filters.merchantStatus}
            options={MERCHANT_STATUSES}
            onChange={(merchantStatus) => setFilters((f) => ({ ...f, merchantStatus }))}
          />
          <SelectField
            label="Risk Level"
            value={filters.riskLevel}
            options={RISK_LEVELS}
            onChange={(riskLevel) => setFilters((f) => ({ ...f, riskLevel }))}
          />
        </FilterBar>

        <KpiGrid items={data?.kpis ?? []} columns={4} />
        <InsightCallout title="Merchant risk notes" items={data?.insights ?? []} />

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Amount share by merchant category" subtitle="Where GMV actually sits — compare this with the chargeback ratio chart next to it">
            <HorizontalBarChart data={data?.amountByCategory ?? []} color="#3B82F6" suffix="%" />
          </Panel>
          <Panel title="Chargeback-to-transaction ratio by category" subtitle="High ratio + low amount share = a small MCC punching above its dispute weight">
            <HorizontalBarChart data={data?.ratioByCategory ?? []} color="#F97316" suffix="%" />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Top merchants by chargeback count" subtitle="Repeat chargebacks, not one-offs — these names belong on the watchlist">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Merchant</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Txns</th>
                  <th className="pb-2 font-semibold">Chargebacks</th>
                  <th className="pb-2 font-semibold">CB / Txn</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topByChargeback ?? []).map((row) => (
                  <tr key={row.merchantId} className="border-t border-slate-100">
                    <td className="py-2.5 font-semibold text-slate-700">{row.merchantName}</td>
                    <td className="py-2.5 text-slate-500">{row.category}</td>
                    <td className="py-2.5">{formatNumber(row.txnCount)}</td>
                    <td className="py-2.5 font-semibold text-rose-500">{formatNumber(row.chargebackCount)}</td>
                    <td className="py-2.5 font-semibold text-amber-600">{formatRatio(row.chargebackCount, row.txnCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Top merchants by disputed amount" subtitle="Loss concentration — queue evidence review on the top of this list first">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Merchant</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Chargebacks</th>
                  <th className="pb-2 font-semibold">Disputed</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topByDisputed ?? []).map((row) => (
                  <tr key={row.merchantId} className="border-t border-slate-100">
                    <td className="py-2.5 font-semibold text-slate-700">{row.merchantName}</td>
                    <td className="py-2.5 text-slate-500">{row.category}</td>
                    <td className="py-2.5 text-rose-500">{formatNumber(row.chargebackCount)}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{formatINR(row.disputedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="mb-4">
          <Panel title="Merchant category performance" subtitle="Volume, GMV, chargebacks and disputed amount in one book — sort visually by who is earning vs who is leaking">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold">Txns</th>
                    <th className="pb-2 font-semibold">Amount</th>
                    <th className="pb-2 font-semibold">Chargebacks</th>
                    <th className="pb-2 font-semibold">Disputed</th>
                    <th className="pb-2 font-semibold">CB / Txn</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.categoryPerformance ?? []).map((row) => (
                    <tr key={row.category} className="border-t border-slate-100">
                      <td className="py-2.5 font-semibold text-slate-700">{row.category}</td>
                      <td className="py-2.5">{formatNumber(row.txns)}</td>
                      <td className="py-2.5">{formatCrore(row.amount / 1e7)}</td>
                      <td className="py-2.5 font-semibold text-rose-500">{formatNumber(row.chargebacks)}</td>
                      <td className="py-2.5">{formatINR(row.disputed)}</td>
                      <td className="py-2.5 font-semibold text-amber-600">{formatRatio(row.chargebacks, row.txns)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="High-risk merchants with repeated disputes" subtitle="High/Critical risk score plus more than one chargeback">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Merchant</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">CBs</th>
                  <th className="pb-2 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {(data?.highRiskMerchants ?? []).map((row) => (
                  <tr key={row.merchantName} className="border-t border-slate-100">
                    <td className="py-2.5 font-semibold text-slate-700">{row.merchantName}</td>
                    <td className="py-2.5 text-slate-500">{row.category}</td>
                    <td className="py-2.5 text-rose-500">{formatNumber(row.chargebackCount)}</td>
                    <td className="py-2.5">
                      <StatusBadge status={row.riskScore >= 90 ? "Critical" : row.riskScore >= 75 ? "High" : "Medium"} />
                      <span className="ml-2 font-bold text-rose-500">{row.riskScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Shock rose by category" subtitle="Nightingale coxcomb: petal length = shocked merchants, colour heat = average spike multiple">
            <CoxcombChart data={data?.spikeRose ?? []} />
          </Panel>
        </div>

        <Panel
          title="Earn vs leak by category"
          subtitle="Blue = share of GMV, far dot = share of chargebacks. A category that slopes up is leaking more disputes than it earns."
        >
          <LeakSlopeChart data={data?.categoryLeak ?? []} />
        </Panel>
        </>
        )}
      </div>
    </AppShell>
  );
}
