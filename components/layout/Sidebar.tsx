"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  GitBranch,
  Home,
  Info,
  LayoutDashboard,
  Repeat,
  Store,
} from "lucide-react";
import { APP_NAME, APP_QUOTE, APP_TAGLINE, NAV_ITEMS } from "@/lib/constants";
import type { NavKey } from "@/lib/types";

const ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
  home: Home,
  dashboard: LayoutDashboard,
  merchants: Store,
  transactions: Repeat,
  "fraud-network": GitBranch,
  "ask-ai": Bot,
  about: Info,
};

function navKeyFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/merchants")) return "merchants";
  if (pathname.startsWith("/transactions")) return "transactions";
  if (pathname.startsWith("/fraud-network")) return "fraud-network";
  if (pathname.startsWith("/ask-ai")) return "ask-ai";
  if (pathname.startsWith("/about")) return "about";
  return "home";
}

export function Sidebar() {
  const pathname = usePathname();
  const active = navKeyFromPath(pathname);
  const isAskAi = pathname.startsWith("/ask-ai");

  return (
    <aside className="relative flex h-screen w-[232px] shrink-0 flex-col overflow-hidden bg-navy-900 text-white">
      <div className="sidebar-dots pointer-events-none absolute inset-0 opacity-70" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30" viewBox="0 0 232 900">
        <g stroke="rgba(96,165,250,0.35)" strokeWidth="0.8" fill="none">
          <circle cx="28" cy="120" r="2.2" fill="rgba(147,197,253,0.7)" />
          <circle cx="70" cy="180" r="1.8" fill="rgba(147,197,253,0.6)" />
          <circle cx="40" cy="260" r="2" fill="rgba(147,197,253,0.5)" />
          <circle cx="90" cy="340" r="1.6" fill="rgba(147,197,253,0.5)" />
          <circle cx="30" cy="430" r="2" fill="rgba(147,197,253,0.4)" />
          <circle cx="78" cy="520" r="1.7" fill="rgba(147,197,253,0.45)" />
          <circle cx="48" cy="640" r="2" fill="rgba(147,197,253,0.4)" />
          <circle cx="100" cy="730" r="1.6" fill="rgba(147,197,253,0.35)" />
          <path d="M28 120 L70 180 L40 260 L90 340 L30 430 L78 520 L48 640 L100 730" />
          <path d="M70 180 L90 340 L78 520" />
        </g>
      </svg>

      <div className="relative z-10 flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-[0_8px_18px_rgba(37,99,235,0.45)]">
          <svg viewBox="0 0 32 32" className="h-6 w-6 text-white">
            <path
              fill="currentColor"
              d="M16 3.2l10 4.2v7.3c0 6.2-4.1 11.8-10 13.3C10.1 26.5 6 20.9 6 14.7V7.4l10-4.2z"
              opacity="0.95"
            />
            <path
              fill="#081628"
              d="M16 9.2c-2.7 0-4.6 1.7-4.6 4.4 0 2.2 1.3 3.6 3.2 4.2v3.1h2.8v-3.1c1.9-.6 3.2-2 3.2-4.2 0-2.7-1.9-4.4-4.6-4.4zm0 6.6c-1.1 0-1.8-.8-1.8-2s.7-2 1.8-2 1.8.8 1.8 2-.7 2-1.8 2z"
            />
          </svg>
        </div>
        <div>
          <div className="text-[17px] font-bold leading-tight tracking-tight">{APP_NAME}</div>
          <div className="text-[10.5px] font-medium text-sky-200/70">{APP_TAGLINE}</div>
        </div>
      </div>

      <nav className="relative z-10 mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.key];
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-[13.5px] font-medium transition ${
                isActive
                  ? "bg-brand-500 text-white shadow-[0_8px_18px_rgba(47,107,255,0.35)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isAskAi ? (
        <div className="relative z-10 mx-4 mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="whitespace-pre-line text-[13px] font-semibold leading-snug text-sky-100">
            {APP_QUOTE}
          </p>
        </div>
      ) : (
        <div className="relative z-10 px-5 pb-6 text-[11px] text-sky-200/40">Detect · Analyze · Prevent</div>
      )}
    </aside>
  );
}
