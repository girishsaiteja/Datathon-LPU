"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Network,
  Shield,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { IndiaSkyline } from "@/components/landing/IndiaSkyline";
import { LandingTopBar, SoftLandingBg } from "@/components/landing/LandingChrome";
import { PhoneMockup } from "@/components/landing/PhoneMockup";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Real-time Insights",
    desc: "Track transactions, merchants and disputes.",
    tone: "bg-sky-50 text-sky-600",
  },
  {
    icon: ShieldCheck,
    title: "Fraud Detection",
    desc: "Identify risky patterns and networks.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Network,
    title: "Data-driven Decisions",
    desc: "Actionable analytics for safer payments.",
    tone: "bg-violet-50 text-violet-600",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    desc: "Ask questions, get instant insights.",
    tone: "bg-rose-50 text-rose-500",
  },
] as const;

export default function LandingPage() {
  return (
    <AppShell>
      <div className="relative flex min-h-full flex-col overflow-hidden bg-white">
        <SoftLandingBg />
        <IndiaSkyline className="pointer-events-none absolute bottom-10 right-4 z-0 w-[380px] text-sky-300/30 lg:bottom-12 lg:right-8 lg:w-[480px]" />

        <div className="relative z-10 flex flex-1 flex-col px-7 pb-6 pt-4 lg:px-10">
          <LandingTopBar />

          <div className="mt-4 grid flex-1 items-center lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-0">
            <div className="relative z-20 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f1ff] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#2563eb]">
                <Shield className="h-3.5 w-3.5" />
                UPI Fraud Analytics
              </span>

              <h1 className="mt-5 text-[42px] font-extrabold leading-[1.05] tracking-tight text-slate-900 lg:text-[50px]">
                Safer Payments
                <br />
                Stronger Trust
                <br />
                <span className="bg-gradient-to-r from-[#2563eb] to-[#7c3aed] bg-clip-text text-transparent">
                  Better Tomorrow
                </span>
              </h1>

              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500">
                AI-powered fraud detection and merchant risk analytics for a safer
                UPI ecosystem.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.32)] transition hover:bg-[#1d4ed8]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  About project
                </Link>
              </div>
            </div>

            <div className="relative z-10 lg:-ml-12 xl:-ml-20">
              <PhoneMockup />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-[0_8px_24px_rgba(15,35,70,0.06)]"
                >
                  <div className="mb-2.5 flex items-start justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${feature.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2563eb]">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <h3 className="text-[13.5px] font-bold text-slate-800">{feature.title}</h3>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
