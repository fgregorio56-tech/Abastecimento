export function SplitStatTile({
  label,
  sub,
  left,
  right,
}: {
  label: string;
  sub?: string;
  left: { label: string; value: string };
  right: { label: string; value: string; tone?: "good" | "critical" };
}) {
  const rightTone =
    right.tone === "good" ? "text-[#0ca30c]" : right.tone === "critical" ? "text-[#d03b3b]" : "text-slate-900";

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-slate-500">{left.value}</span>
        <span className="text-xs text-slate-400">{left.label}</span>
        <span className="text-slate-300">|</span>
        <span className={`text-2xl font-semibold ${rightTone}`}>{right.value}</span>
        <span className="text-xs text-slate-400">{right.label}</span>
      </div>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
