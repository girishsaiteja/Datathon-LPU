export function InsightCallout({
  title = "Analyst notes",
  items,
}: {
  title?: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <section className="mb-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-[#f3f7ff] via-white to-[#fff8f1] px-5 py-4 shadow-kpi">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">{title}</p>
      <ul className="grid gap-2.5 md:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[12.5px] leading-relaxed text-slate-600">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
