export interface MetricRecord {
  id: string;
  vehicleId: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anoModelo: number | null;
  data: Date;
  km: number;
  litros: number;
}

export interface VehicleAgg {
  vehicleId: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anoModelo: number | null;
  kmRodado: number;
  litrosTotal: number;
  litrosConsumo: number;
  media: number | null;
  registros: number;
}

export interface MonthAgg {
  mes: string;
  kmRodado: number;
  litrosTotal: number;
  litrosConsumo: number;
  media: number | null;
}

export interface FleetMetrics {
  kmRodado: number;
  litrosTotal: number;
  litrosConsumo: number;
  media: number | null;
  registros: number;
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calcula, por veículo, o delta de KM e os litros "de consumo" (atribuídos
 * ao intervalo entre dois abastecimentos consecutivos) considerando todo o
 * histórico do veículo — não apenas o período filtrado. Isso garante que um
 * abastecimento no início do período filtrado ainda tenha seu KM anterior
 * de referência. O primeiro abastecimento de cada veículo nunca tem delta
 * (não há referência anterior), mas seus litros ainda contam no total
 * abastecido.
 */
interface Delta {
  record: MetricRecord;
  kmRodado: number;
  litrosConsumo: number;
  isFirstOfVehicle: boolean;
}

function computeDeltas(allRecords: MetricRecord[]): Delta[] {
  const byVehicle = new Map<string, MetricRecord[]>();
  for (const r of allRecords) {
    if (!byVehicle.has(r.vehicleId)) byVehicle.set(r.vehicleId, []);
    byVehicle.get(r.vehicleId)!.push(r);
  }

  const deltas: Delta[] = [];
  for (const records of byVehicle.values()) {
    const sorted = [...records].sort((a, b) => a.data.getTime() - b.data.getTime());
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        deltas.push({ record: sorted[i], kmRodado: 0, litrosConsumo: 0, isFirstOfVehicle: true });
        continue;
      }
      const raw = sorted[i].km - sorted[i - 1].km;
      const kmRodado = raw > 0 ? raw : 0;
      deltas.push({ record: sorted[i], kmRodado, litrosConsumo: sorted[i].litros, isFirstOfVehicle: false });
    }
  }
  return deltas;
}

function inPeriod(date: Date, months: Set<string> | null): boolean {
  if (!months) return true;
  return months.has(monthKey(date));
}

export function computeMetrics(
  allRecords: MetricRecord[],
  months: Set<string> | null,
): { fleet: FleetMetrics; byVehicle: VehicleAgg[]; byMonth: MonthAgg[] } {
  const deltas = computeDeltas(allRecords).filter((d) => inPeriod(d.record.data, months));

  const vehicleMap = new Map<string, VehicleAgg>();
  const monthMap = new Map<string, MonthAgg>();
  const fleet: FleetMetrics = { kmRodado: 0, litrosTotal: 0, litrosConsumo: 0, media: null, registros: 0 };

  for (const d of deltas) {
    const { record } = d;
    const vKey = record.vehicleId;
    if (!vehicleMap.has(vKey)) {
      vehicleMap.set(vKey, {
        vehicleId: record.vehicleId,
        placa: record.placa,
        marca: record.marca,
        modelo: record.modelo,
        anoModelo: record.anoModelo,
        kmRodado: 0,
        litrosTotal: 0,
        litrosConsumo: 0,
        media: null,
        registros: 0,
      });
    }
    const v = vehicleMap.get(vKey)!;
    v.kmRodado += d.kmRodado;
    v.litrosTotal += record.litros;
    v.litrosConsumo += d.litrosConsumo;
    v.registros += 1;

    const mKey = monthKey(record.data);
    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, { mes: mKey, kmRodado: 0, litrosTotal: 0, litrosConsumo: 0, media: null });
    }
    const m = monthMap.get(mKey)!;
    m.kmRodado += d.kmRodado;
    m.litrosTotal += record.litros;
    m.litrosConsumo += d.litrosConsumo;

    fleet.kmRodado += d.kmRodado;
    fleet.litrosTotal += record.litros;
    fleet.litrosConsumo += d.litrosConsumo;
    fleet.registros += 1;
  }

  for (const v of vehicleMap.values()) {
    v.media = v.litrosConsumo > 0 ? v.kmRodado / v.litrosConsumo : null;
  }
  for (const m of monthMap.values()) {
    m.media = m.litrosConsumo > 0 ? m.kmRodado / m.litrosConsumo : null;
  }
  fleet.media = fleet.litrosConsumo > 0 ? fleet.kmRodado / fleet.litrosConsumo : null;

  const byVehicle = [...vehicleMap.values()].sort((a, b) => a.placa.localeCompare(b.placa));
  const byMonth = [...monthMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  return { fleet, byVehicle, byMonth };
}

export function availableMonths(allRecords: MetricRecord[]): string[] {
  const set = new Set(allRecords.map((r) => monthKey(r.data)));
  return [...set].sort();
}

const MIN_REGISTROS_RANKING = 2;

export function ranking(byVehicle: VehicleAgg[], limit = 5) {
  const elegiveis = byVehicle.filter(
    (v) => v.media !== null && v.registros >= MIN_REGISTROS_RANKING,
  );
  const melhores = [...elegiveis].sort((a, b) => (b.media ?? 0) - (a.media ?? 0)).slice(0, limit);
  const piores = [...elegiveis].sort((a, b) => (a.media ?? 0) - (b.media ?? 0)).slice(0, limit);
  return { melhores, piores };
}
