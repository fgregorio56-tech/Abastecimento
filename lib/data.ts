import { prisma } from "@/lib/prisma";
import type { MetricRecord, DeltaSourceRecord } from "@/lib/metrics";

export async function getValidRecordsForMetrics(unidade?: string): Promise<MetricRecord[]> {
  const records = await prisma.fuelRecord.findMany({
    where: {
      hasError: false,
      vehicleId: { not: null },
      ...(unidade ? { vehicle: { unidade } } : {}),
    },
    select: {
      id: true,
      vehicleId: true,
      data: true,
      km: true,
      litros: true,
      combustivel: true,
      origem: true,
      valorTotal: true,
      vehicle: { select: { placa: true, marca: true, modelo: true, anoModelo: true } },
    },
  });

  const result: MetricRecord[] = [];
  for (const r of records) {
    if (!r.vehicleId || !r.data || r.km === null || r.litros === null || !r.vehicle) continue;
    result.push({
      id: r.id,
      vehicleId: r.vehicleId,
      placa: r.vehicle.placa,
      marca: r.vehicle.marca,
      modelo: r.vehicle.modelo,
      anoModelo: r.vehicle.anoModelo,
      data: r.data,
      km: r.km,
      litros: r.litros,
      combustivel: r.combustivel,
      origem: r.origem,
      valorTotal: r.valorTotal,
    });
  }
  return result;
}

/**
 * Registros para calcular a cadeia de KM anterior/rodado/média por
 * abastecimento (ver computeRecordDeltas). Diferente de
 * getValidRecordsForMetrics, inclui também abastecimentos com erro — são
 * justamente os que mais precisam desse contexto (ex.: "KM menor que o
 * anterior" só faz sentido revisar vendo o KM anterior de verdade).
 */
export async function getRecordsForKmChain(): Promise<DeltaSourceRecord[]> {
  const records = await prisma.fuelRecord.findMany({
    where: { vehicleId: { not: null } },
    select: {
      id: true,
      vehicleId: true,
      data: true,
      km: true,
      litros: true,
      combustivel: true,
      kmAnteriorManual: true,
    },
  });

  const result: DeltaSourceRecord[] = [];
  for (const r of records) {
    if (!r.vehicleId || !r.data || r.km === null) continue;
    result.push({
      id: r.id,
      vehicleId: r.vehicleId,
      data: r.data,
      km: r.km,
      litros: r.litros ?? 0,
      combustivel: r.combustivel,
      kmAnteriorManual: r.kmAnteriorManual,
    });
  }
  return result;
}

export async function getVehicleCurrentKm(): Promise<Map<string, number | null>> {
  const rows = await prisma.fuelRecord.groupBy({
    by: ["vehicleId"],
    where: { hasError: false, vehicleId: { not: null } },
    _max: { km: true },
  });
  return new Map(rows.map((r) => [r.vehicleId as string, r._max.km]));
}
