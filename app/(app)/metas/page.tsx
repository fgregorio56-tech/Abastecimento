import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canEditData } from "@/lib/roles";
import { getValidRecordsForMetrics, getVehicleCurrentKm } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { computeGoals } from "@/lib/goals";
import { GoalRow } from "./GoalRow";

export default async function MetasPage() {
  const user = await requireUser();
  const canEdit = canEditData(user.role);

  const [vehicles, records, kmMap] = await Promise.all([
    prisma.vehicle.findMany({ where: { ativo: true }, orderBy: { placa: "asc" } }),
    getValidRecordsForMetrics(),
    getVehicleCurrentKm(),
  ]);

  const { byVehicle } = computeMetrics(records, null);

  const goals = computeGoals(
    vehicles.map((v) => ({
      vehicleId: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anoModelo: v.anoModelo,
      kmAtual: kmMap.get(v.id) ?? null,
      metaManual: v.metaManual,
    })),
    byVehicle,
  );

  const infoMap = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Metas de consumo</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Meta sugerida por veículo, calculada a partir da mediana de consumo de
          veículos com a mesma marca/modelo na frota (ou da mediana geral, quando não
          há grupo suficiente), com ajustes por idade do veículo e por quilometragem
          rodada (rodagem). Você pode sobrescrever a meta manualmente a qualquer momento.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Placa</th>
              <th className="px-3 py-2">Marca / Modelo / Ano</th>
              <th className="px-3 py-2 text-right">KM atual</th>
              <th className="px-3 py-2 text-right">Média atual</th>
              <th className="px-3 py-2 text-right">Meta</th>
              <th className="px-3 py-2 text-right">Diferença</th>
              <th className="px-3 py-2">Origem da meta</th>
              {canEdit && <th className="px-3 py-2">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {goals.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Nenhum veículo ativo cadastrado.
                </td>
              </tr>
            )}
            {goals.map((g) => {
              const v = infoMap.get(g.vehicleId);
              return (
                <GoalRow
                  key={g.vehicleId}
                  goal={g}
                  info={{
                    marca: v?.marca ?? null,
                    modelo: v?.modelo ?? null,
                    anoModelo: v?.anoModelo ?? null,
                    kmAtual: kmMap.get(g.vehicleId) ?? null,
                  }}
                  canEdit={canEdit}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-brand-100 bg-slate-50 p-4 text-xs text-slate-500">
        <p>
          <strong>Diferença</strong> compara a média atual do veículo com a meta:
          valores positivos (verde) indicam que o veículo está rendendo mais km por
          litro do que a meta; valores negativos (vermelho) indicam consumo abaixo
          da meta (rendendo menos km por litro).
        </p>
      </div>
    </div>
  );
}
