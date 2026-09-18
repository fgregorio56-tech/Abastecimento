import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getValidRecordsForMetrics, getVehicleCurrentKm } from "@/lib/data";
import { availableMonths, computeMetrics, computeCivilPeriodTotals } from "@/lib/metrics";
import { computeGoals } from "@/lib/goals";
import { parsePeriod } from "@/lib/period";
import { formatKm, formatLitros, formatMedia, formatCurrency } from "@/lib/format";
import { CHART_COLORS, STATUS_COLORS } from "@/lib/chartColors";
import { PeriodFilter } from "./PeriodFilter";
import { UnitFilter } from "./UnitFilter";
import { StatTile } from "./StatTile";
import { SplitStatTile } from "./SplitStatTile";
import { PerformanceCard } from "./PerformanceCard";
import { MonthlyBarChart } from "./charts/MonthlyBarChart";
import { TrendChart } from "./charts/TrendChart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const selectedMonths = parsePeriod(params);
  const unidade = typeof params.unidade === "string" ? params.unidade : "";

  const [records, errorCount, activeVehicles, incompleteVehicleCount, kmMap] = await Promise.all([
    getValidRecordsForMetrics(unidade || undefined),
    prisma.fuelRecord.count({
      where: { hasError: true, ...(unidade ? { vehicle: { unidade } } : {}) },
    }),
    prisma.vehicle.findMany({ where: { ativo: true, ...(unidade ? { unidade } : {}) } }),
    prisma.vehicle.count({
      where: { ativo: true, OR: [{ marca: null }, { modelo: null }], ...(unidade ? { unidade } : {}) },
    }),
    getVehicleCurrentKm(),
  ]);

  const months = availableMonths(records);
  const effectivePeriod = selectedMonths ?? new Set(months);
  const { fleet, byVehicle, byMonth } = computeMetrics(records, selectedMonths);
  const civil = computeCivilPeriodTotals(records);

  const { byVehicle: lifetimeByVehicle } = computeMetrics(records, null);
  const goals = computeGoals(
    activeVehicles.map((v) => ({
      vehicleId: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anoModelo: v.anoModelo,
      kmAtual: kmMap.get(v.id) ?? null,
      metaManual: v.metaManual,
    })),
    lifetimeByVehicle,
  );
  const goalByVehicleId = new Map(goals.map((g) => [g.vehicleId, g]));
  const vehicleInfoById = new Map(activeVehicles.map((v) => [v.id, v]));

  const desempenhos = byVehicle
    .filter((v) => v.registros >= 2)
    .map((v) => {
      const goal = goalByVehicleId.get(v.vehicleId);
      const meta = goal?.metaFinal ?? null;
      const diferenca = meta && meta > 0 ? Number((((v.media ?? 0) - meta) / meta * 100).toFixed(1)) : null;
      return {
        vehicleId: v.vehicleId,
        placa: v.placa,
        marca: v.marca,
        real: v.media,
        meta,
        diferenca,
      };
    })
    .filter((d) => d.diferenca !== null);

  const piores = [...desempenhos].sort((a, b) => (a.diferenca ?? 0) - (b.diferenca ?? 0)).slice(0, 5);
  const melhores = [...desempenhos].sort((a, b) => (b.diferenca ?? 0) - (a.diferenca ?? 0)).slice(0, 5);

  const discrepanciaMedia =
    desempenhos.length > 0
      ? Number((desempenhos.reduce((sum, d) => sum + (d.diferenca ?? 0), 0) / desempenhos.length).toFixed(1))
      : null;

  const metasValidas = goals.map((g) => g.metaFinal).filter((m): m is number => m !== null && m > 0);
  const metaFrota = metasValidas.length > 0 ? metasValidas.reduce((a, b) => a + b, 0) / metasValidas.length : null;

  const pendenciasAbertas = errorCount + incompleteVehicleCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão geral</h1>
          <p className="text-sm text-slate-500">
            {selectedMonths === null
              ? "Exibindo todo o período disponível"
              : `Exibindo ${effectivePeriod.size} mês(es) selecionado(s)`}
          </p>
        </div>
        {pendenciasAbertas > 0 && (
          <Link
            href="/pendencias"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: STATUS_COLORS.critical }}
          >
            ⚠ {pendenciasAbertas} pendência(s) — revisar
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <UnitFilter initialValue={unidade} />
      </div>

      <PeriodFilter availableMonths={months} selectedMonths={selectedMonths ? [...selectedMonths] : null} />

      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">KM rodado da frota</h3>
          <span className="text-xs text-slate-400">soma do km rodado de todos os veículos, por período civil</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Hoje" value={formatKm(civil.hoje)} />
          <StatTile label="Esta semana" value={formatKm(civil.semana)} />
          <StatTile label="Este mês" value={formatKm(civil.mes)} />
          <StatTile label="Este ano" value={formatKm(civil.ano)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Abastecimentos" value={String(fleet.registros)} />
        <StatTile label="Litros no período" value={formatLitros(fleet.litrosTotal)} />
        <StatTile label="Valor total" value={formatCurrency(fleet.valorTotal)} />
        <StatTile
          label="Veículos ativos"
          value={String(activeVehicles.length)}
          sub={incompleteVehicleCount > 0 ? `${incompleteVehicleCount} fora do cadastro oficial` : undefined}
        />
        <StatTile
          label="Pendências abertas"
          value={String(pendenciasAbertas)}
          tone={pendenciasAbertas > 0 ? "critical" : "good"}
        />
        <StatTile
          label="Discrepância média da frota"
          value={discrepanciaMedia === null ? "—" : `${discrepanciaMedia > 0 ? "+" : ""}${discrepanciaMedia}%`}
          tone={discrepanciaMedia === null ? "default" : discrepanciaMedia >= 0 ? "good" : "critical"}
          sub="real vs meta de cada veículo"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SplitStatTile
          label="Média da frota (km/l)"
          left={{ label: "meta", value: metaFrota !== null ? metaFrota.toFixed(2) : "—" }}
          right={{
            label: "real",
            value: formatMedia(fleet.media).replace(" km/l", ""),
            tone: metaFrota && fleet.media ? (fleet.media >= metaFrota ? "good" : "critical") : undefined,
          }}
        />
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consumo por tipo (litros)</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-slate-900">{formatNumberShort(fleet.litrosInterno)}</span>
            <span className="text-xs text-slate-400">interno</span>
            <span className="text-2xl font-semibold text-slate-500">{formatNumberShort(fleet.litrosExterno)}</span>
            <span className="text-xs text-slate-400">externo</span>
          </div>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Outros produtos (Arla 32, lubrificantes)
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{formatLitros(fleet.outrosProdutosLitros)}</span>
            <span className="text-sm font-medium text-brand-600">{formatCurrency(fleet.outrosProdutosValor)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {fleet.outrosProdutosRegistros} lançamento(s) — não entram no km/l, mas o custo conta pra frota
          </p>
        </div>
      </div>

      {byMonth.length > 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-brand-100 bg-white p-4 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">KM rodado por mês</h3>
            <MonthlyBarChart
              data={byMonth.map((m) => ({ mes: m.mes, valor: Math.round(m.kmRodado) }))}
              color={CHART_COLORS.blue}
              unidade="km"
            />
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-4 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Litros abastecidos por mês</h3>
            <MonthlyBarChart
              data={byMonth.map((m) => ({ mes: m.mes, valor: Math.round(m.litrosTotal) }))}
              color={CHART_COLORS.orange}
              unidade="L"
            />
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-4 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Média (km/l) por mês</h3>
            <TrendChart data={byMonth.map((m) => ({ mes: m.mes, media: m.media }))} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">🔻 Piores desempenhos</h3>
          <p className="mb-2 text-xs text-slate-400">meta e média real em km/l, comparadas ao histórico do próprio veículo</p>
          {piores.length === 0 ? (
            <p className="text-sm text-slate-500">Dados insuficientes no período.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {piores.map((d) => (
                <PerformanceCard key={d.vehicleId} placa={d.placa} marca={vehicleInfoById.get(d.vehicleId)?.marca ?? d.marca} meta={d.meta} real={d.real} diferenca={d.diferenca} />
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">🏆 Melhores desempenhos</h3>
          <p className="mb-2 text-xs text-slate-400">acima da própria meta histórica</p>
          {melhores.length === 0 ? (
            <p className="text-sm text-slate-500">Dados insuficientes no período.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {melhores.map((d) => (
                <PerformanceCard key={d.vehicleId} placa={d.placa} marca={vehicleInfoById.get(d.vehicleId)?.marca ?? d.marca} meta={d.meta} real={d.real} diferenca={d.diferenca} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Resumo por veículo (placa)</h3>
          <Link href="/veiculos" className="text-xs font-medium text-brand-600 hover:underline">
            Ver veículos e metas →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
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

function formatNumberShort(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}L`;
}
