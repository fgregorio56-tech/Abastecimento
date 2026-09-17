"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";

export interface GoalActionResult {
  ok: boolean;
  error?: string;
}

export async function setManualGoal(vehicleId: string, value: string): Promise<GoalActionResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const metaManual = value === "" ? null : Number(value.replace(",", "."));
  if (metaManual !== null && (!Number.isFinite(metaManual) || metaManual <= 0)) {
    return { ok: false, error: "Informe um valor de meta válido (km/l)." };
  }

  const vehicle = await prisma.vehicle.update({ where: { id: vehicleId }, data: { metaManual } });

  await logActivity(
    "META",
    metaManual === null
      ? `Removeu a meta manual do veículo ${vehicle.placa} (voltou ao cálculo automático)`
      : `Definiu meta manual de ${metaManual} km/l para o veículo ${vehicle.placa}`,
    user.id,
  );

  revalidatePath("/metas");
  revalidatePath("/veiculos");
  revalidatePath("/ticket-log");

  return { ok: true };
}
