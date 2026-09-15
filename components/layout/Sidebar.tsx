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
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] text-white">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
          <svg viewBox="0 0 32 32" className="h-5 w-5 text-white">
            <path
              fill="currentColor"
              d="M16 3.2l10 4.2v7.3c0 6.2-4.1 11.8-10 13.3C10.1 26.5 6 20.9 6 14.7V7.4l10-4.2z"
            />
            <path
              fill="#07111f"
              d="M16 9.2c-2.7 0-4.6 1.7-4.6 4.4 0 2.2 1.3 3.6 3.2 4.2v3.1h2.8v-3.1c1.9-.6 3.2-2 3.2-4.2 0-2.7-1.9-4.4-4.6-4.4zm0 6.6c-1.1 0-1.8-.8-1.8-2s.7-2 1.8-2 1.8.8 1.8 2-.7 2-1.8 2z"
            />
          </svg>
        </div>
        <div>
          <div className="text-[16px] font-bold leading-tight tracking-tight">{APP_NAME}</div>
          <div className="text-[11px] text-slate-400">{APP_TAGLINE}</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
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
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              }`}
            >
              <Icon className="h-[17px] w-[17px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isAskAi ? (
        <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
          <p className="whitespace-pre-line text-[12.5px] font-medium leading-snug text-slate-300">
            {APP_QUOTE}
          </p>
        </div>
      ) : (
        <div className="mx-4 mb-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
              <path
                fill="currentColor"
                d="M12 2.4l7.5 3.15v5.5c0 4.65-3.08 8.85-7.5 9.975C7.58 19.9 4.5 15.7 4.5 11.05v-5.5L12 2.4z"
              />
            </svg>
          </div>
          <p className="text-[12px] font-semibold leading-snug text-slate-200">
            Safer Payments
            <br />
            Stronger India
          </p>
        </div>
      )}
    </aside>
  );
}
