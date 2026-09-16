import { isPlacaValida } from "@/lib/placa";

export const ERROR_LABELS: Record<string, string> = {
  PLACA_INVALIDA: "Placa em formato inválido",
  DATA_INVALIDA: "Data inválida",
  DATA_FUTURA: "Data no futuro",
  KM_INVALIDO: "KM inválido ou ausente",
  KM_MENOR_QUE_ANTERIOR: "KM menor que o abastecimento anterior do mesmo veículo",
  LITROS_INVALIDO: "Litragem inválida ou ausente",
  LITROS_MUITO_ALTA: "Litragem muito alta para um único abastecimento (verifique)",
  POSSIVEL_DUPLICIDADE: "Possível duplicidade (mesma placa, data e km)",
  SALTO_KM_MUITO_GRANDE: "Salto de KM muito grande em relação ao abastecimento anterior",
};

export interface FuelRecordLike {
  id: string;
  placaTexto: string;
  data: Date | null;
  km: number | null;
  litros: number | null;
}

const LITROS_MAXIMO_RAZOAVEL = 600;
const KM_SALTO_MAXIMO_RAZOAVEL = 5000;

export function validateRecordFields(record: {
  placaTexto: string;
  data: Date | null;
  km: number | null;
  litros: number | null;
}): string[] {
  const errors: string[] = [];

  if (!record.placaTexto || !isPlacaValida(record.placaTexto)) {
    errors.push("PLACA_INVALIDA");
  }

  if (!record.data || Number.isNaN(record.data.getTime())) {
    errors.push("DATA_INVALIDA");
  } else if (record.data.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    errors.push("DATA_FUTURA");
  }

  if (record.km === null || Number.isNaN(record.km) || record.km < 0) {
    errors.push("KM_INVALIDO");
  }

  if (record.litros === null || Number.isNaN(record.litros) || record.litros <= 0) {
    errors.push("LITROS_INVALIDO");
  } else if (record.litros > LITROS_MAXIMO_RAZOAVEL) {
    errors.push("LITROS_MUITO_ALTA");
  }

  return errors;
}

/**
 * Recebe todos os abastecimentos de um mesmo veículo e devolve, por id, a
 * lista de erros de sequência (KM regressivo, duplicidade, salto de KM).
 * A ordenação usada é por data e, no empate, pela ordem em que os registros
 * são recebidos (normalmente inserção/id).
 */
export function validateVehicleSequence(records: FuelRecordLike[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const record of records) result.set(record.id, []);

  // Só é possível ordenar/sequenciar registros com data e KM válidos.
  const sequenciaveis = records.filter(
    (r): r is FuelRecordLike & { data: Date; km: number } => r.data !== null && r.km !== null,
  );
  const sorted = [...sequenciaveis].sort((a, b) => a.data.getTime() - b.data.getTime());

  const seenKeys = new Map<string, number>();
  for (const record of sorted) {
    const key = `${record.data.toISOString().slice(0, 10)}|${record.km}`;
    seenKeys.set(key, (seenKeys.get(key) ?? 0) + 1);
  }

  let previous: { km: number } | null = null;
  for (const record of sorted) {
    const errors: string[] = [];
    const key = `${record.data.toISOString().slice(0, 10)}|${record.km}`;

    if ((seenKeys.get(key) ?? 0) > 1) {
      errors.push("POSSIVEL_DUPLICIDADE");
    }

    if (previous) {
      if (record.km < previous.km) {
        errors.push("KM_MENOR_QUE_ANTERIOR");
      } else if (record.km - previous.km > KM_SALTO_MAXIMO_RAZOAVEL) {
        errors.push("SALTO_KM_MUITO_GRANDE");
      }
    }

    result.set(record.id, errors);
    previous = record;
  }

  return result;
}
