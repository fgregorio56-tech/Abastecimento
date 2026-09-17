"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { revalidateVehicleRecords } from "@/lib/revalidate";
import { logActivity } from "@/lib/activityLog";

export interface VehicleUpdateResult {
  ok: boolean;
  error?: string;
}

export async function updateVehicle(
  id: string,
  input: { marca: string; modelo: string; anoModelo: string; anoFabricacao: string; ativo: boolean },
): Promise<VehicleUpdateResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const vehicle = await prisma.vehicle.update({
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
  await logActivity("VEICULO", `Atualizou cadastro do veículo ${vehicle.placa}`, user.id);

  revalidatePath("/veiculos");
  revalidatePath("/");
  revalidatePath("/metas");
  revalidatePath("/pendencias");
  revalidatePath("/ticket-log");

  return { ok: true };
}
