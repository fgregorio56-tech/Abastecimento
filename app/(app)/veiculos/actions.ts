"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { revalidateVehicleRecords } from "@/lib/revalidate";

export interface VehicleUpdateResult {
  ok: boolean;
  error?: string;
}

export async function updateVehicle(
  id: string,
  input: { marca: string; modelo: string; anoModelo: string; anoFabricacao: string; ativo: boolean },
): Promise<VehicleUpdateResult> {
  await requireRole("MASTER", "EDITOR");

  await prisma.vehicle.update({
    where: { id },
    data: {
      marca: input.marca || null,
      modelo: input.modelo || null,
      anoModelo: input.anoModelo ? Number(input.anoModelo) : null,
      anoFabricacao: input.anoFabricacao ? Number(input.anoFabricacao) : null,
      ativo: input.ativo,
    },
  });

  await revalidateVehicleRecords(id);

  revalidatePath("/veiculos");
  revalidatePath("/");
  revalidatePath("/metas");

  return { ok: true };
}
