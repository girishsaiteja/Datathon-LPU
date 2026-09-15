import { Activity, BarChart3, Shield, Users } from "lucide-react";

export function PhoneMockup() {
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[480px]">
      {/* soft fill behind phone so the column isn't empty white */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.35)_0%,rgba(196,181,253,0.12)_45%,transparent_70%)]" />
      <div className="pointer-events-none absolute right-4 top-8 h-24 w-24 rounded-full border border-sky-200/60" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-16 w-16 rounded-full border border-violet-200/50" />

      {/* glowing connector curves */}
      <svg
        className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
        viewBox="0 0 480 460"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="glowCyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="glowPurple" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="glowBlue" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M110 100 C165 88, 210 140, 240 185"
          stroke="url(#glowCyan)"
          strokeWidth="2.2"
          filter="url(#softGlow)"
          opacity="0.9"
        />
        <path
          d="M115 345 C175 310, 215 300, 250 280"
          stroke="url(#glowPurple)"
          strokeWidth="2.2"
          filter="url(#softGlow)"
          opacity="0.9"
        />
        <path
          d="M365 185 C335 220, 315 255, 290 285"
          stroke="url(#glowBlue)"
          strokeWidth="2.2"
          filter="url(#softGlow)"
          opacity="0.9"
        />
      </svg>

      {/* Detect Fraud */}
      <div className="absolute left-2 top-10 z-20 flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_10px_30px_rgba(15,35,70,0.10)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Shield className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[13px] font-semibold text-slate-700">Detect Fraud</span>
      </div>

      {/* Analyze Risk */}
      <div className="absolute bottom-12 left-3 z-20 flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_10px_30px_rgba(15,35,70,0.10)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <BarChart3 className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[13px] font-semibold text-slate-700">Analyze Risk</span>
      </div>

      {/* Prevent Threats */}
      <div className="absolute right-1 top-[40%] z-20 flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_10px_30px_rgba(15,35,70,0.10)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Users className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[13px] font-semibold text-slate-700">Prevent Threats</span>
      </div>

      {/* Live pulse chip — fills empty upper-right of graphic */}
      <div className="absolute right-6 top-8 z-20 flex items-center gap-2 rounded-full border border-emerald-100 bg-white/95 px-3 py-1.5 shadow-[0_8px_20px_rgba(15,35,70,0.08)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <Activity className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[11px] font-semibold text-slate-600">Live risk desk</span>
      </div>

      {/* phone */}
      <div className="absolute left-1/2 top-4 z-10 h-[400px] w-[210px] -translate-x-1/2 rotate-[-5deg]">
        <div className="relative h-full w-full rounded-[38px] border-[8px] border-[#7dd3fc] bg-gradient-to-b from-[#0b1b33] via-[#0f2744] to-[#0a1628] shadow-[0_30px_60px_rgba(37,99,235,0.22)]">
          <div className="absolute left-1/2 top-2.5 h-3.5 w-[72px] -translate-x-1/2 rounded-full bg-[#020617]" />
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 text-[30px] font-black tracking-tight text-white">
              <span className="bg-gradient-to-r from-orange-400 via-yellow-300 to-green-400 bg-clip-text text-transparent">
                UPI
              </span>
            </div>
            <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_28px_rgba(16,185,129,0.55)]">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-white">
                <path
                  fill="currentColor"
                  d="M9.2 16.6L4.8 12.2l1.4-1.4 3 3 8-8 1.4 1.4z"
                />
              </svg>
            </div>
            <p className="mt-6 text-[15px] font-bold text-white">Secure Transactions</p>
            <p className="mt-1 text-[12px] font-medium text-slate-300">Brighter Tomorrow</p>
          </div>
        </div>
      </div>
    </div>
  );
}
