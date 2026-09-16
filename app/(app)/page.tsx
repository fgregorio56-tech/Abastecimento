import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getValidRecordsForMetrics } from "@/lib/data";
import { availableMonths, computeMetrics, ranking } from "@/lib/metrics";
import { parsePeriod } from "@/lib/period";
import { formatKm, formatLitros, formatMedia } from "@/lib/format";
import { CHART_COLORS, STATUS_COLORS } from "@/lib/chartColors";
import { PeriodFilter } from "./PeriodFilter";
import { StatTile } from "./StatTile";
import { MonthlyBarChart } from "./charts/MonthlyBarChart";
import { TrendChart } from "./charts/TrendChart";
import { RankingChart } from "./charts/RankingChart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const selectedMonths = parsePeriod(params);

  const [records, errorCount, vehicleCount] = await Promise.all([
    getValidRecordsForMetrics(),
    prisma.fuelRecord.count({ where: { hasError: true } }),
    prisma.vehicle.count({ where: { ativo: true } }),
  ]);

  const months = availableMonths(records);
  const effectivePeriod = selectedMonths ?? new Set(months);
  const { fleet, byVehicle, byMonth } = computeMetrics(records, selectedMonths);
  const { melhores, piores } = ranking(byVehicle, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel de análise</h1>
          <p className="text-sm text-slate-500">
            {selectedMonths === null
              ? "Exibindo todo o período disponível"
              : `Exibindo ${effectivePeriod.size} mês(es) selecionado(s)`}
          </p>
        </div>
        {errorCount > 0 && (
          <Link
            href="/abastecimentos?erro=1"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: STATUS_COLORS.critical }}
          >
            ⚠ {errorCount} abastecimento(s) com erro — revisar
          </Link>
        )}
      </div>

      <PeriodFilter availableMonths={months} selectedMonths={selectedMonths ? [...selectedMonths] : null} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="KM rodado total" value={formatKm(fleet.kmRodado)} sub={`${vehicleCount} veículo(s) ativo(s)`} />
        <StatTile label="Litros abastecidos" value={formatLitros(fleet.litrosTotal)} />
        <StatTile label="Média geral da frota" value={formatMedia(fleet.media)} />
        <StatTile
          label="Abastecimentos com erro"
          value={String(errorCount)}
          tone={errorCount > 0 ? "critical" : "good"}
        />
      </div>

      {byMonth.length > 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">KM rodado por mês</h3>
            <MonthlyBarChart
              data={byMonth.map((m) => ({ mes: m.mes, valor: Math.round(m.kmRodado) }))}
              color={CHART_COLORS.blue}
              unidade="km"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Litros abastecidos por mês</h3>
            <MonthlyBarChart
              data={byMonth.map((m) => ({ mes: m.mes, valor: Math.round(m.litrosTotal) }))}
              color={CHART_COLORS.orange}
              unidade="L"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Média (km/l) por mês</h3>
            <TrendChart data={byMonth.map((m) => ({ mes: m.mes, media: m.media }))} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">🏆 Melhores médias (mais eficientes)</h3>
          {melhores.length === 0 ? (
            <p className="text-sm text-slate-500">Dados insuficientes no período.</p>
          ) : (
            <RankingChart data={melhores.map((v) => ({ placa: v.placa, media: v.media ?? 0 }))} color={STATUS_COLORS.good} />
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">🔻 Piores médias (maior consumo)</h3>
          {piores.length === 0 ? (
            <p className="text-sm text-slate-500">Dados insuficientes no período.</p>
          ) : (
            <RankingChart data={piores.map((v) => ({ placa: v.placa, media: v.media ?? 0 }))} color={STATUS_COLORS.critical} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Resumo por veículo (placa)</h3>
          <Link href="/veiculos" className="text-xs font-medium text-blue-600 hover:underline">
            Ver veículos e metas →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Placa</th>
                <th className="py-2 pr-4">Marca / Modelo</th>
                <th className="py-2 pr-4 text-right">KM rodado</th>
                <th className="py-2 pr-4 text-right">Litros</th>
                <th className="py-2 pr-4 text-right">Média</th>
                <th className="py-2 pr-4 text-right">Registros</th>
              </tr>
            </thead>
            <tbody>
              {byVehicle.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Nenhum dado no período selecionado.
                  </td>
                </tr>
              )}
              {byVehicle.map((v) => (
                <tr key={v.vehicleId} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-900">{v.placa}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatKm(v.kmRodado)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatLitros(v.litrosTotal)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums font-medium">{formatMedia(v.media)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{v.registros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
