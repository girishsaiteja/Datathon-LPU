import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  CircleCheck,
  CircleX,
  Clock,
  Coins,
  FileWarning,
  GitFork,
  Hourglass,
  IndianRupee,
  Percent,
  ShieldX,
  Store,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { KpiItem, KpiTone } from "@/lib/types";

const TONE: Record<KpiTone, { value: string; bar: string; wash: string; icon: string }> = {
  default: { value: "text-slate-800", bar: "bg-slate-300", wash: "from-white to-slate-50", icon: "bg-slate-100 text-slate-600" },
  blue: { value: "text-brand-600", bar: "bg-brand-500", wash: "from-white to-sky-50", icon: "bg-brand-50 text-brand-600" },
  green: { value: "text-emerald-600", bar: "bg-emerald-500", wash: "from-white to-emerald-50", icon: "bg-emerald-50 text-emerald-600" },
  red: { value: "text-rose-500", bar: "bg-rose-500", wash: "from-white to-rose-50", icon: "bg-rose-50 text-rose-500" },
  orange: { value: "text-amber-500", bar: "bg-amber-500", wash: "from-white to-amber-50", icon: "bg-amber-50 text-amber-600" },
  purple: { value: "text-violet-600", bar: "bg-violet-500", wash: "from-white to-violet-50", icon: "bg-violet-50 text-violet-600" },
};

function iconForKpi(label: string): LucideIcon {
  const key = label.toLowerCase();
  if (key.includes("cluster")) return GitFork;
  if (key.includes("suspicious user")) return Users;
  if (key.includes("high-risk") || key.includes("high risk")) return AlertTriangle;
  if (key.includes("merchant") && key.includes("amount")) return Wallet;
  if (key.includes("chargeback amount") || key.includes("disputed")) return Wallet;
  if (key.includes("chargeback")) return Ban;
  if (key.includes("total merchant")) return Store;
  if (key.includes("merchant")) return Store;
  if (key.includes("kyc completion") || key.includes("successful")) return BadgeCheck;
  if (key.includes("kyc rejection") || key.includes("rejected")) return ShieldX;
  if (key.includes("invalid") || key.includes("utr")) return FileWarning;
  if (key.includes("delay") || key.includes("after 7")) return Hourglass;
  if (key.includes("pending")) return Clock;
  if (key.includes("processing")) return Timer;
  if (key.includes("failed")) return CircleX;
  if (key.includes("ratio")) return Percent;
  if (key.includes("average") || key.includes("atv")) return Coins;
  if (key.includes("amount")) return IndianRupee;
  if (key.includes("suspicious transaction")) return Activity;
  if (key.includes("user")) return Users;
  if (key.includes("success")) return CircleCheck;
  return ArrowLeftRight;
}

export function KpiCard({ item }: { item: KpiItem }) {
  const tone = TONE[item.tone ?? "default"];
  const Icon = iconForKpi(item.label);
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br ${tone.wash} px-4 py-3.5 shadow-kpi`}>
      <span className={`absolute inset-y-0 left-0 w-[3px] ${tone.bar}`} />
      <div className="flex items-start justify-between gap-2 pl-1">
        <p className="pr-1 text-[11px] font-semibold uppercase leading-snug tracking-[0.04em] text-slate-500">{item.label}</p>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>
      <p className={`mt-2 pl-1 text-[22px] font-extrabold leading-none tracking-tight ${tone.value}`}>{item.value}</p>
      {item.change ? (
        <p
          className={`mt-2 flex items-center gap-1 pl-1 text-[11px] font-semibold ${
            item.change.good === false
              ? item.change.direction === "up"
                ? "text-rose-500"
                : "text-emerald-600"
              : item.change.direction === "down"
                ? item.change.good
                  ? "text-emerald-600"
                  : "text-rose-500"
                : "text-emerald-600"
          }`}
        >
          {item.change.direction === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {item.change.value}
        </p>
      ) : null}
    </div>
  );
}

const COLS: Record<number, string> = {
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

export function KpiGrid({ items, columns = 6 }: { items: KpiItem[]; columns?: number }) {
  return (
    <div className={`mb-4 grid gap-3.5 ${COLS[columns] ?? COLS[6]}`}>
      {items.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}
