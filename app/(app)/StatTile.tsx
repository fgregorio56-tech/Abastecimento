export function StatTile({
  label,
  value,
  unit,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "default" | "good" | "critical" | "brand";
}) {
  const toneClasses =
    tone === "good"
      ? "text-[#0ca30c]"
      : tone === "critical"
        ? "text-[#d03b3b]"
        : tone === "brand"
          ? "text-brand-600"
          : "text-slate-900";

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
