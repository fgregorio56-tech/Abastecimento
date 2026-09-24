import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canEditData } from "@/lib/roles";
import type { RowData } from "../abastecimentos/EditableRow";
import { FuelRecordsTable } from "../abastecimentos/FuelRecordsTable";
import { VehicleRow, type VehicleRowData } from "../veiculos/VehicleRow";
import { getVehicleCurrentKm, getRecordsForKmChain } from "@/lib/data";
import { computeRecordDeltas } from "@/lib/metrics";
import { UnitFilter } from "../UnitFilter";

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const canEdit = canEditData(user.role);
  const params = await searchParams;
  const unidade = typeof params.unidade === "string" ? params.unidade : "";

  const [errorRecords, incompleteVehicles, correctedCount, kmMap, chainRecords] = await Promise.all([
    prisma.fuelRecord.findMany({
      where: { hasError: true, ...(unidade ? { vehicle: { unidade } } : {}) },
      orderBy: [{ data: "desc" }],
      take: 200,
    }),
    prisma.vehicle.findMany({
      where: { ativo: true, OR: [{ marca: null }, { modelo: null }], ...(unidade ? { unidade } : {}) },
      orderBy: { placa: "asc" },
    }),
    prisma.fuelRecord.count({ where: { hasError: false, corrected: true } }),
    getVehicleCurrentKm(),
    getRecordsForKmChain(),
  ]);
  const deltaMap = computeRecordDeltas(chainRecords);

  const totalPendencias = errorRecords.length + incompleteVehicles.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pendências</h1>
        <p className="text-sm text-slate-500">
          Abastecimentos com erro de validação e veículos sem cadastro completo — tudo que precisa de
          atenção antes de entrar nos relatórios e na exportação.
        </p>
      </div>

      <UnitFilter initialValue={unidade} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="text-sm text-slate-500">Pendências abertas</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{totalPendencias}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="text-sm text-slate-500">Abastecimentos com erro</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{errorRecords.length}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="text-sm text-slate-500">Já corrigidos no histórico</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{correctedCount}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Abastecimentos com erro ({errorRecords.length})
          </h2>
          <Link href="/abastecimentos?erro=1" className="text-xs font-medium text-brand-600 hover:underline">
            Ver na tela de Abastecimentos →
          </Link>
        </div>
        <FuelRecordsTable
          rows={errorRecords.map((r): RowData => {
            const delta = deltaMap.get(r.id);
            return {
              id: r.id,
              placaTexto: r.placaTexto,
              data: r.data ? r.data.toISOString() : null,
              km: r.km,
              kmAnterior: delta?.kmAnterior ?? null,
              kmRodado: delta?.kmRodado ?? null,
              media: delta?.media ?? null,
              litros: r.litros,
              combustivel: r.combustivel,
              origem: r.origem,
              motorista: r.motorista,
              posto: r.posto,
              hasError: r.hasError,
              errors: JSON.parse(r.errors) as string[],
              corrected: r.corrected,
            };
          })}
          canEdit={canEdit}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Veículos sem cadastro completo ({incompleteVehicles.length})
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          Veículos criados automaticamente durante a importação, sem marca/modelo cadastrados — não
          entram na comparação de metas por grupo (marca/modelo) até serem completados.
        </p>
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-slate-50 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Placa</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Marca</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Modelo</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Ano modelo</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Ano fabricação</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Tipo</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">Capacidade</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Unidade</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">KM atual</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">Média geral</th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Situação</th>
                {canEdit && <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {incompleteVehicles.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    Todos os veículos ativos têm cadastro completo. 🎉
                  </td>
                </tr>
              )}
              {incompleteVehicles.map((v) => {
                const row: VehicleRowData = {
                  id: v.id,
                  placa: v.placa,
                  marca: v.marca,
                  modelo: v.modelo,
                  anoModelo: v.anoModelo,
                  anoFabricacao: v.anoFabricacao,
                  tipoVeiculo: v.tipoVeiculo,
                  capacidadeTanque: v.capacidadeTanque,
                  unidade: v.unidade,
                  ativo: v.ativo,
                  kmAtual: kmMap.get(v.id) ?? null,
                  media: null,
                  registros: 0,
                };
                return <VehicleRow key={v.id} vehicle={row} canEdit={canEdit} />;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
