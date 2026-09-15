"use client";

import Link from "next/link";
import { Bot, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PhoneMockup } from "@/components/landing/PhoneMockup";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Real-time Insights",
    desc: "Track transactions, merchants and disputes",
  },
  {
    icon: ShieldCheck,
    title: "Fraud Detection",
    desc: "Identify risky patterns and networks",
  },
  {
    icon: Sparkles,
    title: "Data-driven Decisions",
    desc: "Actionable analytics for safer payments",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    desc: "Ask questions, get instant insights",
  },
];

export default function LandingPage() {
  return (
    <AppShell dark>
      <div className="relative min-h-screen overflow-hidden bg-[#071427] text-white">
        <div className="network-dots absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-navy-radial" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1200 800">
          <g stroke="rgba(96,165,250,0.28)" strokeWidth="0.8" fill="rgba(125,211,252,0.55)">
            <circle cx="180" cy="140" r="2.4" />
            <circle cx="320" cy="90" r="2" />
            <circle cx="260" cy="240" r="2.2" />
            <circle cx="420" cy="200" r="1.8" />
            <circle cx="700" cy="80" r="2" />
            <circle cx="880" cy="160" r="2.4" />
            <circle cx="980" cy="60" r="1.6" />
            <circle cx="1100" cy="220" r="2" />
            <circle cx="150" cy="480" r="2" />
            <circle cx="360" cy="560" r="2.2" />
            <circle cx="520" cy="640" r="1.8" />
            <circle cx="860" cy="520" r="2" />
            <circle cx="1040" cy="600" r="2.2" />
            <path d="M180 140 L320 90 L420 200 L260 240 Z" fill="none" />
            <path d="M700 80 L880 160 L980 60 L1100 220" fill="none" />
            <path d="M150 480 L360 560 L520 640 L860 520 L1040 600" fill="none" />
          </g>
        </svg>

        <div className="relative z-10 px-10 pb-8 pt-6">
          <div className="mb-2 flex items-center justify-end gap-2 text-[11px] font-semibold tracking-[0.18em] text-sky-200/70">
            <span>Detect</span>
            <span className="text-sky-400">·</span>
            <span>Analyze</span>
            <span className="text-sky-400">·</span>
            <span>Prevent</span>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-2xl pt-6">
              <h1 className="text-[52px] font-extrabold leading-[1.05] tracking-tight">
                Safer Payments
                <br />
                Stronger Trust
                <br />
                <span className="bg-gradient-to-r from-sky-200 to-brand-400 bg-clip-text text-transparent">
                  Better Tomorrow
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-300">
                AI-powered fraud detection and merchant risk analytics for a safer UPI ecosystem.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(47,107,255,0.35)] transition hover:bg-brand-600"
                >
                  Get Started →
                </Link>
              </div>
            </div>
            <PhoneMockup />
          </div>

          <div id="features" className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-5 backdrop-blur-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-sky-200">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold">{feature.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[12px] text-slate-400">
            <div className="flex flex-wrap gap-5">
              <span>Banks</span>
              <span>Merchants</span>
              <span>Users</span>
              <span>Regulators</span>
            </div>
            <div className="font-medium text-sky-200/80">A Safe UPI Ecosystem</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
