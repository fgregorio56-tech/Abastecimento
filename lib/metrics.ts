import { contaParaMedia } from "@/lib/roles";

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
  combustivel: string;
  origem: string;
  valorTotal: number | null;
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
  litrosInterno: number;
  litrosExterno: number;
  valorTotal: number;
  media: number | null;
  registros: number;
  outrosProdutosLitros: number;
  outrosProdutosValor: number;
  outrosProdutosRegistros: number;
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
 * abastecido. Registros de "outros produtos" (Arla, lubrificante) nunca
 * geram delta de KM nem entram no denominador da média — apenas somam no
 * total de litros/valor desses produtos, à parte.
 */
interface Delta {
  record: MetricRecord;
  kmRodado: number;
  litrosConsumo: number;
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
    let previousComKm: MetricRecord | null = null;
    for (const record of sorted) {
      if (!contaParaMedia(record.combustivel)) {
        deltas.push({ record, kmRodado: 0, litrosConsumo: 0 });
        continue;
      }
      if (!previousComKm) {
        deltas.push({ record, kmRodado: 0, litrosConsumo: 0 });
      } else {
        const raw = record.km - previousComKm.km;
        deltas.push({ record, kmRodado: raw > 0 ? raw : 0, litrosConsumo: record.litros });
      }
      previousComKm = record;
    }
  }
  return deltas;
}

export interface RecordDelta {
  kmAnterior: number | null;
  kmRodado: number | null;
  media: number | null;
}

/**
 * Calcula, por abastecimento, o KM do abastecimento anterior do mesmo
 * veículo, o KM rodado desde então e a média (km/l) daquele abastecimento
 * específico — usando a mesma cadeia (por veículo, ordenada por data,
 * ignorando Arla/lubrificante) que computeDeltas usa para a frota.
 * Precisa receber o histórico completo do veículo, não apenas a página
 * exibida, para que o primeiro registro de uma página ainda tenha
 * referência ao abastecimento anterior real.
 */
export function computeRecordDeltas(allRecords: MetricRecord[]): Map<string, RecordDelta> {
  const byVehicle = new Map<string, MetricRecord[]>();
  for (const r of allRecords) {
    if (!byVehicle.has(r.vehicleId)) byVehicle.set(r.vehicleId, []);
    byVehicle.get(r.vehicleId)!.push(r);
  }

  const result = new Map<string, RecordDelta>();
  for (const records of byVehicle.values()) {
    const sorted = [...records].sort((a, b) => a.data.getTime() - b.data.getTime());
    let previousComKm: MetricRecord | null = null;
    for (const record of sorted) {
      if (!contaParaMedia(record.combustivel)) {
        result.set(record.id, { kmAnterior: null, kmRodado: null, media: null });
        continue;
      }
      if (!previousComKm) {
        result.set(record.id, { kmAnterior: null, kmRodado: null, media: null });
      } else {
        const kmRodado = record.km - previousComKm.km;
        const media = kmRodado > 0 && record.litros > 0 ? kmRodado / record.litros : null;
        result.set(record.id, { kmAnterior: previousComKm.km, kmRodado, media });
      }
      previousComKm = record;
    }
  }
  return result;
}

function inPeriod(date: Date, months: Set<string> | null): boolean {
  if (!months) return true;
  return months.has(monthKey(date));
}

function emptyFleet(): FleetMetrics {
  return {
    kmRodado: 0,
    litrosTotal: 0,
    litrosConsumo: 0,
    litrosInterno: 0,
    litrosExterno: 0,
    valorTotal: 0,
    media: null,
    registros: 0,
    outrosProdutosLitros: 0,
    outrosProdutosValor: 0,
    outrosProdutosRegistros: 0,
  };
}

export function computeMetrics(
  allRecords: MetricRecord[],
  months: Set<string> | null,
): { fleet: FleetMetrics; byVehicle: VehicleAgg[]; byMonth: MonthAgg[] } {
  const deltas = computeDeltas(allRecords).filter((d) => inPeriod(d.record.data, months));

  const vehicleMap = new Map<string, VehicleAgg>();
  const monthMap = new Map<string, MonthAgg>();
  const fleet = emptyFleet();

  for (const d of deltas) {
    const { record } = d;

    if (!contaParaMedia(record.combustivel)) {
      fleet.outrosProdutosLitros += record.litros;
      fleet.outrosProdutosValor += record.valorTotal ?? 0;
      fleet.outrosProdutosRegistros += 1;
      continue;
    }

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
    fleet.valorTotal += record.valorTotal ?? 0;
    fleet.registros += 1;
    if (record.origem === "INTERNO") fleet.litrosInterno += record.litros;
    else fleet.litrosExterno += record.litros;
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

export interface CivilPeriodTotals {
  hoje: number;
  semana: number;
  mes: number;
  ano: number;
}

function startOfUTCDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** KM rodado por período civil (hoje/semana/mês/ano), sempre com base em todo o histórico. */
export function computeCivilPeriodTotals(allRecords: MetricRecord[], now = new Date()): CivilPeriodTotals {
  const deltas = computeDeltas(allRecords).filter((d) => contaParaMedia(d.record.combustivel));

  const hojeInicio = startOfUTCDay(now);
  const diaSemana = now.getUTCDay();
  const semanaInicio = new Date(hojeInicio);
  semanaInicio.setUTCDate(semanaInicio.getUTCDate() - diaSemana);
  const mesInicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const anoInicio = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const totals: CivilPeriodTotals = { hoje: 0, semana: 0, mes: 0, ano: 0 };
  for (const d of deltas) {
    const t = d.record.data.getTime();
    if (t >= anoInicio.getTime()) totals.ano += d.kmRodado;
    if (t >= mesInicio.getTime()) totals.mes += d.kmRodado;
    if (t >= semanaInicio.getTime()) totals.semana += d.kmRodado;
    if (t >= hojeInicio.getTime()) totals.hoje += d.kmRodado;
  }
  return totals;
}
