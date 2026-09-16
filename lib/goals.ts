import type { VehicleAgg } from "@/lib/metrics";

export interface GoalInput {
  vehicleId: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anoModelo: number | null;
  kmAtual: number | null;
  metaManual: number | null;
}

export interface GoalResult {
  vehicleId: string;
  placa: string;
  metaCalculada: number | null;
  metaFinal: number | null;
  origem: "manual" | "grupo_marca_modelo" | "media_frota" | "indisponivel";
  baseUsada: number | null;
  ajusteIdade: number;
  ajusteRodagem: number;
  mediaAtual: number | null;
  diferencaPercentual: number | null;
}

const ANO_TOLERANCIA_SEM_PENALIDADE = 3;
const PENALIDADE_POR_ANO = 0.015;
const PENALIDADE_IDADE_MAXIMA = 0.15;

const KM_TOLERANCIA_SEM_PENALIDADE = 80_000;
const KM_FAIXA = 10_000;
const PENALIDADE_POR_FAIXA_KM = 0.01;
const PENALIDADE_RODAGEM_MAXIMA = 0.2;

const PENALIDADE_TOTAL_MAXIMA = 0.35;
const PISO_META = 0.6; // meta nunca cai abaixo de 60% da base do grupo

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function groupKey(marca: string | null, modelo: string | null) {
  return `${(marca ?? "").trim().toLowerCase()}|${(modelo ?? "").trim().toLowerCase()}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Calcula a meta de média (km/l) para cada veículo, considerando:
 *  - marca/modelo: usa a mediana de consumo de veículos semelhantes na frota
 *    como referência (base), caindo para a mediana geral da frota quando não
 *    há um grupo com dados suficientes;
 *  - ano/modelo: veículos com mais de 3 anos recebem uma pequena penalidade
 *    progressiva na meta (mais antigos tendem a consumir mais);
 *  - rodagem (km atual do veículo): acima de 80.000 km, aplica-se penalidade
 *    progressiva a cada 10.000 km excedentes (desgaste do veículo).
 * O resultado é apenas uma sugestão editável — o campo `metaManual` do
 * veículo sempre tem prioridade quando preenchido.
 */
export function computeGoals(vehicles: GoalInput[], lifetimeMetrics: VehicleAgg[]): GoalResult[] {
  const mediaPorVeiculo = new Map(lifetimeMetrics.map((v) => [v.vehicleId, v.media]));

  const groups = new Map<string, number[]>();
  for (const v of vehicles) {
    const media = mediaPorVeiculo.get(v.vehicleId);
    if (media === null || media === undefined) continue;
    const key = groupKey(v.marca, v.modelo);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(media);
  }

  const frotaMedias = [...mediaPorVeiculo.values()].filter((m): m is number => m !== null && m !== undefined);
  const medianaFrota = median(frotaMedias);

  const currentYear = new Date().getFullYear();

  return vehicles.map((v) => {
    const mediaAtual = mediaPorVeiculo.get(v.vehicleId) ?? null;
    const key = groupKey(v.marca, v.modelo);
    const grupo = groups.get(key) ?? [];

    let base: number | null = null;
    let origem: GoalResult["origem"] = "indisponivel";
    if (grupo.length >= 2) {
      base = median(grupo);
      origem = "grupo_marca_modelo";
    } else if (medianaFrota !== null) {
      base = medianaFrota;
      origem = "media_frota";
    }

    let ajusteIdade = 0;
    if (v.anoModelo) {
      const idade = Math.max(0, currentYear - v.anoModelo);
      if (idade > ANO_TOLERANCIA_SEM_PENALIDADE) {
        ajusteIdade = clamp(
          (idade - ANO_TOLERANCIA_SEM_PENALIDADE) * PENALIDADE_POR_ANO,
          0,
          PENALIDADE_IDADE_MAXIMA,
        );
      }
    }

    let ajusteRodagem = 0;
    if (v.kmAtual && v.kmAtual > KM_TOLERANCIA_SEM_PENALIDADE) {
      const excedente = v.kmAtual - KM_TOLERANCIA_SEM_PENALIDADE;
      ajusteRodagem = clamp(
        (excedente / KM_FAIXA) * PENALIDADE_POR_FAIXA_KM,
        0,
        PENALIDADE_RODAGEM_MAXIMA,
      );
    }

    const penalidadeTotal = clamp(ajusteIdade + ajusteRodagem, 0, PENALIDADE_TOTAL_MAXIMA);
    const metaCalculada = base !== null ? Number((base * (1 - penalidadeTotal)).toFixed(2)) : null;
    const pisoAbsoluto = base !== null ? base * PISO_META : null;
    const metaCalculadaComPiso =
      metaCalculada !== null && pisoAbsoluto !== null
        ? Number(Math.max(metaCalculada, pisoAbsoluto).toFixed(2))
        : metaCalculada;

    const metaFinal = v.metaManual ?? metaCalculadaComPiso;
    const diferencaPercentual =
      metaFinal && mediaAtual !== null && metaFinal > 0
        ? Number((((mediaAtual - metaFinal) / metaFinal) * 100).toFixed(1))
        : null;

    return {
      vehicleId: v.vehicleId,
      placa: v.placa,
      metaCalculada: metaCalculadaComPiso,
      metaFinal,
      origem: v.metaManual !== null ? "manual" : origem,
      baseUsada: base,
      ajusteIdade: Number((ajusteIdade * 100).toFixed(1)),
      ajusteRodagem: Number((ajusteRodagem * 100).toFixed(1)),
      mediaAtual,
      diferencaPercentual,
    };
  });
}
