"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { parseWorkbook } from "@/lib/import";
import { isPlacaValida } from "@/lib/placa";
import { revalidateVehicleRecords, revalidateUnlinkedRecords } from "@/lib/revalidate";
import { logActivity } from "@/lib/activityLog";
import { revalidatePath } from "next/cache";

export interface ImportState {
  ok: boolean;
  error?: string;
}

export async function processImport(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireRole("MASTER", "EDITOR");

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Selecione um arquivo .xlsx ou .csv para importar." };
  }

  const buffer = await file.arrayBuffer();
  let rows;
  try {
    rows = parseWorkbook(buffer);
  } catch {
    return { ok: false as const, error: "Não foi possível ler o arquivo. Verifique o formato (.xlsx ou .csv)." };
  }

  if (rows.length === 0) {
    return { ok: false as const, error: "O arquivo não contém linhas de dados." };
  }

  const batch = await prisma.importBatch.create({
    data: { fileName: file.name, importedById: user.id, totalRows: rows.length },
  });

  const vehicleCache = new Map<string, string>();
  const affectedVehicleIds = new Set<string>();

  for (const row of rows) {
    let vehicleId: string | null = null;

    if (isPlacaValida(row.placaTexto)) {
      if (vehicleCache.has(row.placaTexto)) {
        vehicleId = vehicleCache.get(row.placaTexto)!;
      } else {
        const vehicle = await prisma.vehicle.upsert({
          where: { placa: row.placaTexto },
          update: {
            ...(row.marca ? { marca: row.marca } : {}),
            ...(row.modelo ? { modelo: row.modelo } : {}),
            ...(row.anoModelo ? { anoModelo: row.anoModelo } : {}),
            ...(row.anoFabricacao ? { anoFabricacao: row.anoFabricacao } : {}),
          },
          create: {
            placa: row.placaTexto,
            marca: row.marca,
            modelo: row.modelo,
            anoModelo: row.anoModelo,
            anoFabricacao: row.anoFabricacao,
            createdById: user.id,
          },
        });
        vehicleId = vehicle.id;
        vehicleCache.set(row.placaTexto, vehicleId);
      }
      affectedVehicleIds.add(vehicleId);
    }

    await prisma.fuelRecord.create({
      data: {
        placaTexto: row.placaTexto,
        vehicleId,
        data: row.data,
        km: row.km,
        litros: row.litros,
        valorLitro: row.valorLitro,
        valorTotal: row.valorTotal,
        posto: row.posto,
        combustivel: row.combustivel ?? "DIESEL",
        origem: row.origem ?? "EXTERNO",
        motorista: row.motorista,
        importBatchId: batch.id,
        createdById: user.id,
        hasError: true,
        errors: JSON.stringify(["PENDENTE_VALIDACAO"]),
      },
    });
  }

  for (const vehicleId of affectedVehicleIds) {
    await revalidateVehicleRecords(vehicleId);
  }
  await revalidateUnlinkedRecords(batch.id);

  const errorRows = await prisma.fuelRecord.count({ where: { importBatchId: batch.id, hasError: true } });
  await prisma.importBatch.update({ where: { id: batch.id }, data: { errorRows } });

  await logActivity(
    "IMPORTACAO",
    `Importou "${file.name}" (${rows.length} linha(s), ${errorRows} com pendência)`,
    user.id,
  );

  revalidatePath("/");
  revalidatePath("/abastecimentos");
  revalidatePath("/veiculos");
  revalidatePath("/pendencias");

  redirect(`/abastecimentos?lote=${batch.id}`);
}
