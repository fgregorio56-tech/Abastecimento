import { formatMedia } from "@/lib/format";

export function PerformanceCard({
  placa,
  marca,
  meta,
  real,
  diferenca,
}: {
  placa: string;
  marca: string | null;
  meta: number | null;
  real: number | null;
  diferenca: number | null;
}) {
  const good = diferenca !== null && diferenca >= 0;
  const tone = diferenca === null ? "text-slate-400" : good ? "text-[#0ca30c]" : "text-[#d03b3b]";

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div>
        <p className="text-sm font-bold text-slate-900">{placa}</p>
        <p className="text-xs uppercase tracking-wide text-slate-500">{marca ?? "—"}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meta</p>
          <p className="text-sm font-medium text-slate-600">{formatMedia(meta)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Real</p>
          <p className="text-sm font-medium text-slate-900">{formatMedia(real)}</p>
        </div>
        <p className={`w-16 text-right text-sm font-bold ${tone}`}>
          {diferenca === null ? "—" : `${diferenca > 0 ? "+" : ""}${diferenca}%`}
        </p>
      </div>
    </div>
  );
}
