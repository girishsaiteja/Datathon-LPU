"use client";

import { useMemo, useState } from "react";
import { DualTrendChart } from "@/components/charts/DualTrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar, SelectField } from "@/components/ui/FilterBar";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { KpiGrid } from "@/components/ui/KpiCard";
import { PageLoader, RefreshingBar } from "@/components/ui/PageLoader";
import { Panel } from "@/components/ui/Panel";
import {
  MERCHANT_CATEGORIES,
  MERCHANT_STATUSES,
  RISK_SEGMENTS,
  USER_TYPES,
} from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { useDateRange } from "@/lib/use-date-range";
import type { DashboardFilters, KpiItem } from "@/lib/types";

type Slice = { name: string; value: number; color: string };

type DashboardResponse = {
  kpis: KpiItem[];
  insights: string[];
  dailyTrend: {
    date: string;
    volume: number;
    amount: number;
    failed: number;
    success: number;
    avgValue: number;
  }[];
  hourFailed: { hour: string; failed: number; volume: number }[];
  chargebackTrend: { date: string; chargebacks: number; disputed: number }[];
  statusDistribution: Slice[];
  reasonDistribution: Slice[];
  severityDistribution: Slice[];
  disputeByCategory: { name: string; value: number }[];
  kycDistribution: Slice[];
  totals: { totalTxns: number; cbCount: number; kycTotal: number };
  error?: string;
};

type Meta = { dateFrom: string; dateTo: string; merchantCategories: string[] };

export default function ExecutiveDashboardPage() {
  const { data: meta } = useApi<Meta>("/api/meta");
  const { date } = useDateRange();
  const [filters, setFilters] = useState<DashboardFilters>({
    merchantCategory: "All",
    merchantStatus: "All",
    riskSegment: "All",
    userType: "All",
  });

  const url = useMemo(() => {
    const q = new URLSearchParams({ ...filters, from: date.from, to: date.to });
    return `/api/dashboard?${q.toString()}`;
  }, [filters, date]);

  const { data, loading, refreshing, error } = useApi<DashboardResponse>(url);
  const categories = meta?.merchantCategories ?? [...MERCHANT_CATEGORIES];
  const firstLoad = loading && !data;

  return (
    <AppShell>
      <div className="px-6 py-5">
        <PageHeader
          title="Executive Dashboard"
          subtitle="Unified intelligence for UPI transactions, chargebacks, KYC, and fraud risk"
        />
        {error ? (
          <p className="mb-3 text-[13px] text-rose-500">{error}</p>
        ) : null}
        {refreshing ? <RefreshingBar /> : null}
        {firstLoad ? (
          <PageLoader
            embedded
            message="Pulling KPIs, daily trends and chargeback mix from the warehouse."
          />
        ) : (
        <>
        <FilterBar className="!grid grid-cols-2 sm:grid-cols-4">
          <SelectField
            label="Merchant Category"
            value={filters.merchantCategory}
            options={categories}
            onChange={(merchantCategory) =>
              setFilters((f) => ({ ...f, merchantCategory }))
            }
          />
          <SelectField
            label="Merchant Status"
            value={filters.merchantStatus}
            options={MERCHANT_STATUSES}
            onChange={(merchantStatus) =>
              setFilters((f) => ({ ...f, merchantStatus }))
            }
          />
          <SelectField
            label="Risk Segment"
            value={filters.riskSegment}
            options={RISK_SEGMENTS}
            onChange={(riskSegment) =>
              setFilters((f) => ({ ...f, riskSegment }))
            }
          />
          <SelectField
            label="User Type"
            value={filters.userType}
            options={USER_TYPES}
            onChange={(userType) => setFilters((f) => ({ ...f, userType }))}
          />
        </FilterBar>

        <KpiGrid items={data?.kpis ?? []} columns={6} />
        <InsightCallout title="Analyst notes" items={data?.insights ?? []} />

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel
            title="Daily transaction volume & value"
            subtitle="Bars = count, area = amount in crore — use this to spot volume spikes before disputes land"
          >
            <DualTrendChart
              data={data?.dailyTrend ?? []}
              barKey="volume"
              lineKey="amount"
              barName="Volume"
              lineName="Amount (Cr)"
              barColor="#60A5FA"
              lineColor="#F59E0B"
            />
          </Panel>
          <Panel
            title="Successful vs failed by day"
            subtitle="Failure trend should not rise with volume — if it does, issuer or MCC quality is slipping"
          >
            <TrendLineChart
              data={data?.dailyTrend ?? []}
              series={[
                { key: "success", name: "Successful", color: "#22C55E" },
                { key: "failed", name: "Failed", color: "#EF4444" },
              ]}
            />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel
            title="Chargeback count & disputed amount"
            subtitle="Disputed rupees (lakh) lag volume — a late spike is often delayed fraud detection"
          >
            <DualTrendChart
              data={data?.chargebackTrend ?? []}
              barKey="chargebacks"
              lineKey="disputed"
              barName="Chargebacks"
              lineName="Disputed Amount (L)"
              barColor="#F87171"
              lineColor="#FB923C"
            />
          </Panel>
          <Panel
            title="Failed transactions by hour"
            subtitle="Hour-of-day failures vs total volume — overnight peaks often mean issuer timeouts"
          >
            <DualTrendChart
              data={data?.hourFailed ?? []}
              xKey="hour"
              barKey="failed"
              lineKey="volume"
              barName="Failed"
              lineName="All txns"
              barColor="#EF4444"
              lineColor="#64748B"
            />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel
            title="Chargeback-to-transaction ratio by category"
            subtitle="Categories above portfolio ratio are where underwriting should tighten first"
          >
            <HorizontalBarChart
              data={data?.disputeByCategory ?? []}
              color="#F97316"
              suffix="%"
            />
          </Panel>
          <Panel
            className="h-full"
            title="KYC status distribution"
            subtitle="Rejected and pending KYC cohorts usually carry higher dispute intensity"
          >
            <DonutChart
              data={data?.kycDistribution ?? []}
              centerValue={formatNumber(data?.totals.kycTotal ?? 0)}
              centerLabel="Customers"
              layout="split"
            />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel
            className="h-full"
            title="Transaction status"
            subtitle="Failed + pending is operational risk, not just conversion"
          >
            <DonutChart
              data={data?.statusDistribution ?? []}
              centerValue={formatNumber(data?.totals.totalTxns ?? 0)}
              centerLabel="Txns"
            />
          </Panel>
          <Panel
            className="h-full"
            title="Dispute severity"
            subtitle="Critical/High share is the loss-severity signal behind the count"
          >
            <DonutChart
              data={data?.severityDistribution ?? []}
              centerValue={formatNumber(data?.totals.cbCount ?? 0)}
              centerLabel="CBs"
            />
          </Panel>
        </div>

        <Panel
          title="Chargeback reason mix"
          subtitle="A dominant reason code is a product or MCC problem, not random noise"
        >
          <DonutChart
            data={data?.reasonDistribution ?? []}
            centerValue={formatNumber(data?.totals.cbCount ?? 0)}
            centerLabel="CBs"
            layout="split"
            columns={2}
          />
        </Panel>
        </>
        )}
      </div>
    </AppShell>
  );
}
