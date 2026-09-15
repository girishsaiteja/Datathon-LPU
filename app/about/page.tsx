"use client";

import { CheckCircle2, Cpu, Shield, Target } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const OBJECTIVES = [
  "Identify fraudulent transaction patterns and merchant risk",
  "Detect collusive fraud rings using network analytics",
  "Provide actionable insights for risk managers",
  "Enable real-time monitoring and early warning",
  "Support a safe and transparent UPI ecosystem",
];

export default function AboutPage() {
  return (
    <AppShell dark>
      <div className="relative min-h-screen overflow-hidden bg-[#071427] text-white">
        <div className="network-dots absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute inset-0 bg-navy-radial" />

        <div className="relative z-10 px-10 py-8">
          <div className="mb-8">
            <h1 className="text-[32px] font-extrabold tracking-tight">
              About This Project
            </h1>
            <p className="mt-1 text-[14px] text-sky-200/70">
              UPI Fraud & Merchant Analytics Platform
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-bold">
                <Shield className="h-5 w-5 text-sky-300" />
                Project Overview
              </div>
              <p className="text-[13.5px] leading-relaxed text-slate-300">
                UPI Guard is an AI-powered fraud detection and merchant risk
                analytics platform built for the Indian UPI ecosystem. It
                unifies transaction monitoring, chargeback intelligence, KYC
                quality and collusive network detection into a single
                interactive workspace for banks, risk teams and regulators.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-bold">
                <Target className="h-5 w-5 text-sky-300" />
                Key Objectives
              </div>
              <ul className="space-y-2.5">
                {OBJECTIVES.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[13px] text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
            <div className="mb-4 flex items-center gap-2 text-[15px] font-bold">
              <Cpu className="h-5 w-5 text-sky-300" />
              Tech Stack
            </div>
            <div className="flex flex-wrap gap-3">
              {["Python", "Supabase", "Next.js", "Recharts", "Gemini API"].map(
                (tech) => (
                  <span
                    key={tech}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-sky-100"
                  >
                    {tech}
                  </span>
                ),
              )}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6">
            <div className="mb-2 text-[15px] font-bold text-emerald-200">
              Impact
            </div>
            <ul className="space-y-1.5 text-[13.5px] text-emerald-50/90">
              <li>Helps detect fraud early for banks and merchants</li>
              <li>Improves trust in digital payments</li>
              <li>Turns messy real-world UPI data into decisions</li>
            </ul>
          </section>

          <div className="mt-8 text-center text-[13px] font-semibold tracking-wide text-sky-200/80">
            Safe Payments. Stronger Trust. Better Tomorrow.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
