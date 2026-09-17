import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@/lib/roles";

export async function logActivity(tipo: ActivityType, descricao: string, userId?: string | null) {
  await prisma.activityLog.create({
    data: { tipo, descricao, userId: userId ?? null },
  });
}
