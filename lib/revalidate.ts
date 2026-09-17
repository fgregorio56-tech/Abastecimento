import { prisma } from "@/lib/prisma";
import { validateRecordFields, validateVehicleSequence } from "@/lib/validation";

/**
 * Revalida todos os abastecimentos de um veículo (campos + sequência de KM)
 * e persiste o resultado (hasError / errors) no banco.
 */
export async function revalidateVehicleRecords(vehicleId: string) {
  const records = await prisma.fuelRecord.findMany({
    where: { vehicleId },
    select: { id: true, placaTexto: true, data: true, km: true, litros: true, combustivel: true },
  });

  const sequenceErrors = validateVehicleSequence(
    records.map((r) => ({
      id: r.id,
      placaTexto: r.placaTexto,
      data: r.data,
      km: r.km,
      litros: r.litros,
      combustivel: r.combustivel,
    })),
  );

  await prisma.$transaction(
    records.map((r) => {
      const fieldErrors = validateRecordFields({
        placaTexto: r.placaTexto,
        data: r.data,
        km: r.km,
        litros: r.litros,
      });
      const errors = [...fieldErrors, ...(sequenceErrors.get(r.id) ?? [])];
      return prisma.fuelRecord.update({
        where: { id: r.id },
        data: { hasError: errors.length > 0, errors: JSON.stringify(errors) },
      });
    }),
  );
}

/**
 * Revalida abastecimentos sem veículo vinculado (placa não reconhecida ou em
 * formato inválido — por isso não foi possível associar/criar o veículo).
 */
export async function revalidateUnlinkedRecords(importBatchId?: string) {
  const records = await prisma.fuelRecord.findMany({
    where: { vehicleId: null, ...(importBatchId ? { importBatchId } : {}) },
    select: { id: true, placaTexto: true, data: true, km: true, litros: true },
  });

  await prisma.$transaction(
    records.map((r) => {
      const fieldErrors = validateRecordFields({
        placaTexto: r.placaTexto,
        data: r.data,
        km: r.km,
        litros: r.litros,
      });
      const errors = fieldErrors.includes("PLACA_INVALIDA")
        ? fieldErrors
        : [...fieldErrors, "PLACA_INVALIDA"];
      return prisma.fuelRecord.update({
        where: { id: r.id },
        data: { hasError: true, errors: JSON.stringify(errors) },
      });
    }),
  );
}
