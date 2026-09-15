"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DonutChart } from "@/components/charts/DonutChart";
import { DualTrendChart } from "@/components/charts/DualTrendChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { VerticalBarChart } from "@/components/charts/VerticalBarChart";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar, SelectField } from "@/components/ui/FilterBar";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { KpiGrid } from "@/components/ui/KpiCard";
import { PageLoader, RefreshingBar } from "@/components/ui/PageLoader";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AMOUNT_RANGES,
  MERCHANT_CATEGORIES,
  TXN_STATUSES,
  USER_TYPES,
} from "@/lib/constants";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { useDateRange } from "@/lib/use-date-range";
import type { KpiItem, TransactionFilters, TransactionRow } from "@/lib/types";

type TxnResponse = {
  kpis: KpiItem[];
  insights: string[];
  rows: TransactionRow[];
  pages: number;
  page: number;
  trend: { date: string; count: number; failed: number }[];
  amounts: { name: string; value: number }[];
  hourFailed: { hour: string; failed: number; volume: number }[];
  delayDistribution: { name: string; value: number }[];
  kycMix: { name: string; value: number; amount: number; color: string }[];
  highValueChargebacks: { userId: string; name: string; disputedAmount: number; disputeCount: number; kycStatus: string }[];
  quality: {
    invalidUtr: number;
    invalidFailed: number;
    invalidCb: number;
    duplicateGroups: number;
    duplicateExtra: number;
    avgDelay: number;
    delayedCount: number;
  };
};

type Meta = {
  dateFrom: string;
  dateTo: string;
  merchantCategories: string[];
  merchantIds: string[];
  userIds: string[];
};

export default function TransactionExplorerPage() {
  const { data: meta } = useApi<Meta>("/api/meta");
  const { date } = useDateRange();
  const [filters, setFilters] = useState<TransactionFilters>({
    status: "All",
    merchantCategory: "All",
    amountMin: "",
    amountMax: "",
    userType: "All",
    merchantId: "All",
    userId: "All",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState("");

  const url = useMemo(() => {
    const q = new URLSearchParams({
      ...filters,
      from: date.from,
      to: date.to,
      page: String(page),
      pageSize: String(pageSize),
    });
    return `/api/transactions?${q.toString()}`;
  }, [filters, date, page, pageSize]);

  const { data, loading, refreshing, error } = useApi<TxnResponse>(url);
  const pages = data?.pages ?? 1;
  const amountRangeValue =
    AMOUNT_RANGES.find((r) => r.min === filters.amountMin && r.max === filters.amountMax)?.label ?? "All";
  const quality = data?.quality;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchText }));
    setPage(1);
  }

  function updateFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <AppShell>
      <div className="px-6 py-5">
        <PageHeader
          title="Transaction Explorer"
          subtitle="Failures by day and hour, UTR quality, delayed disputes and high-value chargeback customers"
          onDateChange={() => setPage(1)}
        />
        {error ? <p className="mb-3 text-[13px] text-rose-500">{error}</p> : null}
        {refreshing ? <RefreshingBar /> : null}
        {loading && !data ? (
          <PageLoader embedded message="Loading transactions, UTR quality and dispute delays." />
        ) : (
        <>
        <FilterBar>
          <SelectField label="Status" value={filters.status} options={TXN_STATUSES} onChange={(status) => updateFilter("status", status)} />
          <SelectField
            label="Merchant Category"
            value={filters.merchantCategory}
            options={meta?.merchantCategories ?? [...MERCHANT_CATEGORIES]}
            onChange={(merchantCategory) => updateFilter("merchantCategory", merchantCategory)}
          />
          <SelectField
            label="Amount Range"
            value={amountRangeValue}
            options={AMOUNT_RANGES.map((r) => r.label)}
            onChange={(label) => {
              const range = AMOUNT_RANGES.find((r) => r.label === label) ?? AMOUNT_RANGES[0];
              setFilters((f) => ({ ...f, amountMin: range.min, amountMax: range.max }));
              setPage(1);
            }}
          />
          <SelectField label="User Type" value={filters.userType} options={USER_TYPES} onChange={(userType) => updateFilter("userType", userType)} />
          <SelectField
            label="Merchant ID"
            value={filters.merchantId}
            options={meta?.merchantIds ?? ["All"]}
            onChange={(merchantId) => updateFilter("merchantId", merchantId)}
          />
          <SelectField
            label="User ID"
            value={filters.userId}
            options={meta?.userIds ?? ["All"]}
            onChange={(userId) => updateFilter("userId", userId)}
          />
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Search</span>
            <div className="flex gap-2">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Txn ID, UTR, User, Merchant"
                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                onClick={applySearch}
                className="inline-flex h-[38px] items-center gap-1 rounded-lg bg-brand-500 px-4 text-[13px] font-semibold text-white hover:bg-brand-600"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </FilterBar>

        <KpiGrid items={data?.kpis ?? []} columns={6} />
        <InsightCallout title="Transaction quality notes" items={data?.insights ?? []} />

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Failed transaction trend by day" subtitle="Failed vs all volume — a rising fail line with flat volume is an issuer or rail issue">
            <TrendLineChart
              data={data?.trend ?? []}
              series={[
                { key: "count", name: "All transactions", color: "#3B82F6" },
                { key: "failed", name: "Failed", color: "#EF4444" },
              ]}
            />
          </Panel>
          <Panel title="Failed transactions by hour" subtitle="Day-part the failures before you blame the MCC">
            <DualTrendChart
              data={data?.hourFailed ?? []}
              xKey="hour"
              barKey="failed"
              lineKey="volume"
              barName="Failed"
              lineName="All txns"
              barColor="#EF4444"
              lineColor="#94A3B8"
            />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Amount distribution" subtitle="High-ticket buckets are where chargeback rupees hide">
            <VerticalBarChart data={data?.amounts ?? []} xKey="name" yKey="value" name="Transactions" color="#3B82F6" />
          </Panel>
          <Panel title="Dispute reporting delay" subtitle="7d+ filings are the ATO / delayed-detection bucket">
            <VerticalBarChart data={data?.delayDistribution ?? []} xKey="name" yKey="value" name="Disputes" color="#F97316" />
          </Panel>
        </div>

        <div className="mb-4 grid items-stretch gap-4 xl:grid-cols-2">
          <Panel className="h-full" title="KYC status of transacting users" subtitle="Rejected/pending KYC still moving money is a policy leak">
            <DonutChart
              data={data?.kycMix ?? []}
              centerValue={formatNumber((data?.kycMix ?? []).reduce((s, r) => s + r.value, 0))}
              centerLabel="Txns"
              layout="split"
              columns={1}
            />
          </Panel>
          <Panel className="h-full" title="Customers with high-value chargebacks" subtitle="Repeat + high disputed amount — freeze review queue">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Customer</th>
                  <th className="pb-2 font-semibold">KYC</th>
                  <th className="pb-2 font-semibold">Disputes</th>
                  <th className="pb-2 font-semibold">Disputed amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.highValueChargebacks ?? []).map((row) => (
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
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 px-4 py-3.5 shadow-kpi">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">Invalid / missing UTR</p>
            <p className="mt-1 text-[22px] font-extrabold text-rose-600">{formatNumber(quality?.invalidUtr ?? 0)}</p>
            <p className="mt-1 text-[12px] text-slate-500">
              {formatNumber(quality?.invalidFailed ?? 0)} also failed · {formatNumber(quality?.invalidCb ?? 0)} already charged back
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 px-4 py-3.5 shadow-kpi">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Late disputes (7d+)</p>
            <p className="mt-1 text-[22px] font-extrabold text-amber-600">{formatNumber(quality?.delayedCount ?? 0)}</p>
            <p className="mt-1 text-[12px] text-slate-500">Average reporting delay {quality?.avgDelay?.toFixed(1) ?? "0.0"} days</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 px-4 py-3.5 shadow-kpi">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Duplicate txn groups</p>
            <p className="mt-1 text-[22px] font-extrabold text-brand-600">{formatNumber(quality?.duplicateGroups ?? 0)}</p>
            <p className="mt-1 text-[12px] text-slate-500">
              {formatNumber(quality?.duplicateExtra ?? 0)} extra rows that can inflate GMV and dispute rates
            </p>
          </div>
        </div>

        <Panel title="Transaction ledger" subtitle="Most recent matching rows — invalid UTR is flagged as MISSING">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-3 font-semibold">Txn ID</th>
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">User ID</th>
                  <th className="pb-3 font-semibold">Merchant</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">UTR</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((row) => (
                  <tr key={row.txnId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-700">{row.txnId}</td>
                    <td className="py-3 text-slate-500">{formatDateTime(row.timestamp)}</td>
                    <td className="py-3">{row.userId}</td>
                    <td className="py-3">
                      <p>{row.merchantId}</p>
                      <p className="text-[11px] text-slate-400">{row.merchantCategory}</p>
                    </td>
                    <td className="py-3 font-medium">{formatINR(row.amount)}</td>
                    <td className="py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={`py-3 ${row.utr === "MISSING" || !/^UTR\d{10}$/.test(row.utr) ? "font-semibold text-rose-500" : "text-slate-500"}`}>
                      {row.utr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-500">
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">
                ‹
              </button>
              <span className="rounded-lg bg-brand-500 px-2.5 py-1 font-semibold text-white">{page}</span>
              <span>of {formatNumber(pages)}</span>
              <button disabled={page === pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">
                ›
              </button>
            </div>
            <label className="flex items-center gap-2">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
        </Panel>
        </>
        )}
      </div>
    </AppShell>
  );
}
