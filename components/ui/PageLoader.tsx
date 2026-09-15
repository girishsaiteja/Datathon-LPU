"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function RefreshingBar({ label = "Updating live analytics…" }: { label?: string }) {
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-sky-800">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        {label}
      </div>
      <div className="loader-indeterminate mt-2 h-[3px] overflow-hidden rounded-full bg-sky-100" />
    </div>
  );
}

export function PageLoader({
  title,
  subtitle,
  message = "Querying live UPI transactions, merchants, chargebacks and risk scores.",
  embedded = false,
}: {
  title?: string;
  subtitle?: string;
  message?: string;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "" : "px-6 py-5"}>
      {title ? (
        <div className="mb-4">
          <h1 className="text-[28px] font-extrabold tracking-tight text-slate-800">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p> : null}
        </div>
      ) : null}

      <div className="mb-4 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-4 py-3.5 shadow-kpi">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-slate-800">Loading live analytics</p>
            <p className="mt-0.5 text-[12px] text-slate-500">{message}</p>
          </div>
          <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-brand-600" />
        </div>
        <div className="loader-indeterminate mt-3 h-[4px] overflow-hidden rounded-full bg-sky-100" />
      </div>

      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-kpi">
            <Pulse className="h-3 w-24" />
            <Pulse className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-kpi">
          <Pulse className="h-3.5 w-48" />
          <Pulse className="mt-2 h-2.5 w-64" />
          <Pulse className="mt-6 h-[220px] w-full rounded-2xl" />
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-kpi">
          <Pulse className="h-3.5 w-40" />
          <Pulse className="mt-2 h-2.5 w-56" />
          <Pulse className="mt-6 h-[220px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
