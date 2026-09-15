"use client";

import {
  BarChart3,
  CheckCircle2,
  FileText,
  Info,
  Leaf,
  Settings2,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { IndiaSkyline } from "@/components/landing/IndiaSkyline";
import {
  LandingFooter,
  LandingTopBar,
  SoftLandingBg,
} from "@/components/landing/LandingChrome";
import {
  GeminiLogo,
  NextjsLogo,
  PythonLogo,
  RechartsLogo,
  SupabaseLogo,
} from "@/components/landing/TechLogos";

const OBJECTIVES = [
  "Identify fraudulent transaction patterns and merchant risk",
  "Detect collusive fraud rings using network analytics",
  "Provide actionable insights for risk managers",
  "Enable real-time monitoring and early warning",
  "Support a safe and transparent UPI ecosystem",
];

const STACK = [
  { name: "Python", desc: "Data Processing & Analysis", Logo: PythonLogo },
  { name: "Supabase", desc: "Database & Authentication", Logo: SupabaseLogo },
  { name: "Next.js", desc: "Frontend Framework", Logo: NextjsLogo },
  { name: "Recharts", desc: "Data Visualization", Logo: RechartsLogo },
  { name: "Gemini API", desc: "AI Assistant & Insights", Logo: GeminiLogo },
] as const;

const IMPACT = [
  {
    icon: Users,
    title: "Helps detect fraud early",
    desc: "Protects banks, merchants and users from financial losses",
  },
  {
    icon: ShieldCheck,
    title: "Improves trust in digital payments",
    desc: "Strengthens confidence in the UPI ecosystem",
  },
  {
    icon: BarChart3,
    title: "Turns messy real-world data into decisions",
    desc: "Enables data-driven actions for a safer India",
  },
] as const;

export default function AboutPage() {
  return (
    <AppShell>
      <div className="relative flex min-h-full flex-col overflow-hidden bg-white">
        <SoftLandingBg />

        <div className="relative z-10 flex min-h-full flex-1 flex-col px-8 pb-4 pt-5 lg:px-12">
          <LandingTopBar />

          <section className="relative mt-5 overflow-hidden rounded-[28px] border border-sky-100/70 bg-gradient-to-br from-[#eef6ff] via-white to-[#f5f3ff] px-7 py-8 shadow-[0_8px_28px_rgba(15,35,70,0.05)]">
            <IndiaSkyline className="pointer-events-none absolute bottom-0 right-2 w-[300px] text-sky-300/45 lg:w-[360px]" />

            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#2563eb] shadow-sm">
                <Info className="h-3.5 w-3.5" />
                About Our Project
              </span>
              <h1 className="mt-4 text-[34px] font-extrabold tracking-tight text-slate-900 lg:text-[40px]">
                About <span className="text-[#2563eb]">UPI Guard</span>
              </h1>
              <p className="mt-2 text-[15px] font-semibold text-slate-700">
                AI-powered UPI fraud detection &amp; merchant risk analytics
              </p>
              <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-slate-500">
                UPI Guard leverages data, AI and network analytics to detect fraudulent
                transactions and identify risky merchants — giving banks and risk teams
                one live workspace for the Indian UPI ecosystem.
              </p>
            </div>

            <div className="pointer-events-none absolute right-8 top-7 z-10 hidden text-right md:block">
              <p className="rotate-[-5deg] font-script text-[24px] font-semibold leading-tight text-slate-600">
                Safer Payments
                <br />
                Brighter Tomorrow
              </p>
              <div className="ml-auto mt-1 h-[3px] w-28 rotate-[-5deg] rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-[#2563eb]" />
            </div>
          </section>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_24px_rgba(15,35,70,0.05)]">
              <div className="mb-3 flex items-center gap-2.5 text-[15px] font-bold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#2563eb]">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                Project Overview
              </div>
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                UPI Guard is an AI-powered fraud detection and merchant risk analytics
                platform built for the Indian UPI ecosystem. It unifies transaction
                monitoring, chargeback intelligence, KYC quality and collusive network
                detection into a single interactive workspace for banks, risk teams and
                regulators.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_24px_rgba(15,35,70,0.05)]">
              <div className="mb-3 flex items-center gap-2.5 text-[15px] font-bold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Target className="h-[18px] w-[18px]" />
                </span>
                Key Objectives
              </div>
              <ul className="space-y-2.5">
                {OBJECTIVES.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[13px] text-slate-600"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-violet-100/80 bg-[#f6f4ff] p-6 shadow-[0_8px_24px_rgba(15,35,70,0.04)]">
            <div className="mb-4 flex items-center gap-2.5 text-[15px] font-bold text-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Settings2 className="h-[18px] w-[18px]" />
              </span>
              Technology Stack
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {STACK.map((tech) => {
                const Logo = tech.Logo;
                return (
                  <div
                    key={tech.name}
                    className="flex items-center gap-3 rounded-xl border border-white bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,35,70,0.04)]"
                  >
                    <Logo className="h-8 w-8 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-slate-800">{tech.name}</div>
                      <div className="text-[11px] leading-snug text-slate-500">{tech.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="relative mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-[#ecfdf5] p-6 shadow-[0_8px_24px_rgba(15,35,70,0.04)]">
            <svg
              className="pointer-events-none absolute inset-y-0 right-0 h-full w-[42%] text-emerald-200/50"
              viewBox="0 0 280 200"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M80 0c40 40 20 70 50 110s70 50 90 90H280V0H80z"
              />
              <path
                fill="currentColor"
                opacity="0.5"
                d="M120 0c30 50 10 80 45 120s60 40 80 80H280V0H120z"
              />
            </svg>

            <div className="relative z-10 mb-5 flex items-center gap-2.5 text-[15px] font-bold text-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Leaf className="h-[18px] w-[18px]" />
              </span>
              Impact
            </div>

            <div className="relative z-10 grid gap-5 pr-0 md:grid-cols-3 md:pr-36">
              {IMPACT.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-bold leading-snug text-slate-800">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-5 right-5 z-10 flex h-[92px] w-[92px] rotate-[-8deg] items-center justify-center rounded-full border border-emerald-100 bg-white shadow-[0_8px_20px_rgba(15,35,70,0.08)]">
              <div className="px-2 text-center">
                <p className="text-[10px] font-bold leading-tight text-slate-700">
                  Secure Inclusive
                  <br />
                  Digital India
                </p>
                <div className="mx-auto mt-1.5 h-[3px] w-10 rounded-full bg-gradient-to-r from-orange-400 to-emerald-500" />
              </div>
            </div>
          </section>

          <div className="mt-6">
            <LandingFooter />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
