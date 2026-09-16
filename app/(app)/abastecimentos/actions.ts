"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { normalizePlaca, isPlacaValida } from "@/lib/placa";
import { revalidateVehicleRecords, revalidateUnlinkedRecords } from "@/lib/revalidate";

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

export async function updateFuelRecord(
  id: string,
  input: { placa: string; data: string; km: string; litros: string },
): Promise<UpdateResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const record = await prisma.fuelRecord.findUnique({ where: { id }, select: { vehicleId: true } });
  if (!record) return { ok: false, error: "Registro não encontrado." };

  const placaTexto = normalizePlaca(input.placa);
  const parsedDate = input.data ? new Date(`${input.data}T12:00:00Z`) : null;
  const km = input.km === "" ? null : Number(input.km.replace(",", "."));
  const litros = input.litros === "" ? null : Number(input.litros.replace(",", "."));

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

  revalidatePath("/abastecimentos");
  revalidatePath("/");
  revalidatePath("/veiculos");

  return { ok: true };
}

export async function deleteFuelRecord(id: string): Promise<UpdateResult> {
  await requireRole("MASTER", "EDITOR");

  const record = await prisma.fuelRecord.findUnique({ where: { id }, select: { vehicleId: true } });
  if (!record) return { ok: false, error: "Registro não encontrado." };

  await prisma.fuelRecord.delete({ where: { id } });

  if (record.vehicleId) {
    await revalidateVehicleRecords(record.vehicleId);
  }

  revalidatePath("/abastecimentos");
  revalidatePath("/");
  revalidatePath("/veiculos");

  return { ok: true };
}
