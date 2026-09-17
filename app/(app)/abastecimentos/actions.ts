"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { normalizePlaca, isPlacaValida } from "@/lib/placa";
import { revalidateVehicleRecords, revalidateUnlinkedRecords } from "@/lib/revalidate";
import { logActivity } from "@/lib/activityLog";
import { FUEL_TYPES, ORIGENS } from "@/lib/roles";

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

function revalidateAbastecimentoPaths() {
  revalidatePath("/abastecimentos");
  revalidatePath("/pendencias");
  revalidatePath("/ticket-log");
  revalidatePath("/");
  revalidatePath("/veiculos");
}

export async function updateFuelRecord(
  id: string,
  input: { placa: string; data: string; km: string; litros: string; combustivel?: string; origem?: string },
): Promise<UpdateResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const record = await prisma.fuelRecord.findUnique({ where: { id }, select: { vehicleId: true, placaTexto: true } });
  if (!record) return { ok: false, error: "Registro não encontrado." };

  const placaTexto = normalizePlaca(input.placa);
  const parsedDate = input.data ? new Date(`${input.data}T12:00:00Z`) : null;
  const km = input.km === "" ? null : Number(input.km.replace(",", "."));
  const litros = input.litros === "" ? null : Number(input.litros.replace(",", "."));
  const combustivel = input.combustivel && FUEL_TYPES.includes(input.combustivel as (typeof FUEL_TYPES)[number])
    ? input.combustivel
    : undefined;
  const origem = input.origem && ORIGENS.includes(input.origem as (typeof ORIGENS)[number])
    ? input.origem
    : undefined;

  let vehicleId: string | null = null;
  if (isPlacaValida(placaTexto)) {
    const vehicle = await prisma.vehicle.upsert({
      where: { placa: placaTexto },
      update: {},
      create: { placa: placaTexto, createdById: user.id },
    });
    vehicleId = vehicle.id;
  }

  const oldVehicleId = record.vehicleId;

  await prisma.fuelRecord.update({
    where: { id },
    data: {
      placaTexto,
      vehicleId,
      data: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
      km: km !== null && Number.isFinite(km) ? km : null,
      litros: litros !== null && Number.isFinite(litros) ? litros : null,
      ...(combustivel ? { combustivel } : {}),
      ...(origem ? { origem } : {}),
      corrected: true,
      updatedById: user.id,
    },
  });

  if (vehicleId) {
    await revalidateVehicleRecords(vehicleId);
  }
  if (oldVehicleId && oldVehicleId !== vehicleId) {
    await revalidateVehicleRecords(oldVehicleId);
  }
  if (!vehicleId) {
    await revalidateUnlinkedRecords();
  }

  await logActivity("CORRECAO", `Corrigiu abastecimento de ${record.placaTexto || placaTexto}`, user.id);

  revalidateAbastecimentoPaths();

  return { ok: true };
}

export async function deleteFuelRecord(id: string): Promise<UpdateResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const record = await prisma.fuelRecord.findUnique({ where: { id }, select: { vehicleId: true, placaTexto: true } });
  if (!record) return { ok: false, error: "Registro não encontrado." };

  await prisma.fuelRecord.delete({ where: { id } });

  if (record.vehicleId) {
    await revalidateVehicleRecords(record.vehicleId);
  }

  await logActivity("EXCLUSAO", `Excluiu abastecimento de ${record.placaTexto}`, user.id);

  revalidateAbastecimentoPaths();

  return { ok: true };
}

export interface BulkDeleteResult extends UpdateResult {
  deletedCount?: number;
}

export async function deleteMultipleFuelRecords(ids: string[]): Promise<BulkDeleteResult> {
  const user = await requireRole("MASTER", "EDITOR");

  if (ids.length === 0) return { ok: false, error: "Nenhum registro selecionado." };

  const records = await prisma.fuelRecord.findMany({
    where: { id: { in: ids } },
    select: { vehicleId: true },
  });

  const { count } = await prisma.fuelRecord.deleteMany({ where: { id: { in: ids } } });

  const affectedVehicleIds = new Set(records.map((r) => r.vehicleId).filter((v): v is string => v !== null));
  for (const vehicleId of affectedVehicleIds) {
    await revalidateVehicleRecords(vehicleId);
  }

  await logActivity("EXCLUSAO", `Excluiu ${count} abastecimento(s) em lote`, user.id);

  revalidateAbastecimentoPaths();

  return { ok: true, deletedCount: count };
}
