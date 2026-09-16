"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export interface GoalActionResult {
  ok: boolean;
  error?: string;
}

export async function setManualGoal(vehicleId: string, value: string): Promise<GoalActionResult> {
  await requireRole("MASTER", "EDITOR");

  const metaManual = value === "" ? null : Number(value.replace(",", "."));
  if (metaManual !== null && (!Number.isFinite(metaManual) || metaManual <= 0)) {
    return { ok: false, error: "Informe um valor de meta válido (km/l)." };
  }

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { metaManual } });

  revalidatePath("/metas");
  revalidatePath("/veiculos");

  return { ok: true };
}
