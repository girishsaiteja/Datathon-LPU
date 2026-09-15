export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Success: "bg-emerald-50 text-emerald-600",
    Failed: "bg-rose-50 text-rose-500",
    Pending: "bg-amber-50 text-amber-600",
    Processing: "bg-sky-50 text-sky-600",
    Active: "bg-emerald-50 text-emerald-600",
    Inactive: "bg-slate-100 text-slate-500",
    "On Hold": "bg-amber-50 text-amber-600",
    Suspended: "bg-rose-50 text-rose-500",
    Low: "bg-emerald-50 text-emerald-600",
    Medium: "bg-amber-50 text-amber-600",
    High: "bg-orange-50 text-orange-600",
    Approved: "bg-emerald-50 text-emerald-600",
    Rejected: "bg-rose-50 text-rose-500",
    "In Progress": "bg-sky-50 text-sky-600",
    Unknown: "bg-slate-100 text-slate-500",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
