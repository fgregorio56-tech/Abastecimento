import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canEditData } from "@/lib/roles";
import { getValidRecordsForMetrics, getVehicleCurrentKm } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { VehicleRow, type VehicleRowData } from "./VehicleRow";

export default async function VeiculosPage() {
  const user = await requireUser();
  const canEdit = canEditData(user.role);

  const [vehicles, records] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { placa: "asc" } }),
    getValidRecordsForMetrics(),
  ]);

  const { byVehicle } = computeMetrics(records, null);
  const mediaByVehicle = new Map(byVehicle.map((v) => [v.vehicleId, v]));

  const rows: VehicleRowData[] = vehicles.map((v) => {
    const agg = mediaByVehicle.get(v.id);
    return {
      id: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anoModelo: v.anoModelo,
      anoFabricacao: v.anoFabricacao,
      ativo: v.ativo,
      kmAtual: null,
      media: agg?.media ?? null,
      registros: agg?.registros ?? 0,
    };
  });

  const kmMap = await getVehicleCurrentKm();
  for (const row of rows) row.kmAtual = kmMap.get(row.id) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Veículos</h1>
          <p className="text-sm text-slate-500">{vehicles.length} veículo(s) cadastrados</p>
        </div>
        <Link href="/metas" className="text-sm font-medium text-brand-600 hover:underline">
          Ver metas de consumo →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Placa</th>
              <th className="px-3 py-2">Marca</th>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2">Ano modelo</th>
              <th className="px-3 py-2">Ano fabricação</th>
              <th className="px-3 py-2 text-right">KM atual</th>
              <th className="px-3 py-2 text-right">Média geral</th>
              <th className="px-3 py-2">Situação</th>
              {canEdit && <th className="px-3 py-2">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  Nenhum veículo cadastrado. Importe uma planilha de abastecimentos para começar.
                </td>
              </tr>
            )}
            {rows.map((v) => (
              <VehicleRow key={v.id} vehicle={v} canEdit={canEdit} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
