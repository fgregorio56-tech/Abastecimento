"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { revalidateVehicleRecords, revalidateUnlinkedRecords } from "@/lib/revalidate";
import { logActivity } from "@/lib/activityLog";

export interface VehicleUpdateResult {
  ok: boolean;
  error?: string;
}

export async function updateVehicle(
  id: string,
  input: {
    marca: string;
    modelo: string;
    anoModelo: string;
    anoFabricacao: string;
    tipoVeiculo: string;
    capacidadeTanque: string;
    unidade: string;
    ativo: boolean;
  },
): Promise<VehicleUpdateResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const capacidade = input.capacidadeTanque ? Number(input.capacidadeTanque.replace(",", ".")) : null;

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      marca: input.marca || null,
      modelo: input.modelo || null,
      anoModelo: input.anoModelo ? Number(input.anoModelo) : null,
      anoFabricacao: input.anoFabricacao ? Number(input.anoFabricacao) : null,
      tipoVeiculo: input.tipoVeiculo || null,
      capacidadeTanque: capacidade !== null && Number.isFinite(capacidade) ? capacidade : null,
      unidade: input.unidade || null,
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

/**
 * Exclui o cadastro do veículo. Os abastecimentos já lançados não são
 * apagados — ficam sem veículo vinculado (placa "solta") e passam a
 * aparecer em Pendências até serem reassociados (ex.: reimportando ou
 * corrigindo a placa em cada um).
 */
export async function deleteVehicle(id: string): Promise<VehicleUpdateResult> {
  const user = await requireRole("MASTER", "EDITOR");

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return { ok: false, error: "Veículo não encontrado." };

  await prisma.vehicle.delete({ where: { id } });
  await revalidateUnlinkedRecords();
  await logActivity("VEICULO", `Excluiu o cadastro do veículo ${vehicle.placa}`, user.id);

  revalidatePath("/veiculos");
  revalidatePath("/");
  revalidatePath("/metas");
  revalidatePath("/pendencias");
  revalidatePath("/ticket-log");

  return { ok: true };
}
