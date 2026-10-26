import { formatMedia } from "@/lib/format";
import { LicensePlate } from "./LicensePlate";

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
  const badgeTone =
    diferenca === null
      ? "bg-slate-100 text-slate-500"
      : good
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-600";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <LicensePlate placa={placa} />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{marca ?? "—"}</p>
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
        <span className={`inline-flex w-16 items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${badgeTone}`}>
          {diferenca === null ? "—" : `${diferenca > 0 ? "+" : ""}${diferenca}%`}
        </span>
      </div>
    </div>
  );
}
