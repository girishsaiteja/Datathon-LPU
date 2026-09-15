import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  extra,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-kpi ${className}`}>
      {(title || extra || subtitle) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-[14px] font-bold text-slate-800">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-[11.5px] text-slate-400">{subtitle}</p> : null}
          </div>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}
