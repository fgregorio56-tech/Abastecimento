"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { logActivity } from "@/lib/activityLog";

export interface UserActionResult {
  ok: boolean;
  error?: string;
}

export type CreateUserState = UserActionResult;

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const me = await requireRole("MASTER");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "VIEWER") as Role;

  if (!name || !email || !password) {
    return { ok: false, error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (!ROLES.includes(role)) {
    return { ok: false, error: "Perfil inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Já existe um usuário com esse e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role } });

  await logActivity("USUARIO", `Criou o usuário ${name} (${ROLE_LABELS[role]})`, me.id);

  revalidatePath("/usuarios");
  revalidatePath("/ticket-log");
  return { ok: true };
}

export async function toggleUserActive(userId: string, active: boolean): Promise<UserActionResult> {
  const me = await requireRole("MASTER");
  if (me.id === userId) {
    return { ok: false, error: "Você não pode desativar seu próprio usuário." };
  }

  const target = await prisma.user.update({ where: { id: userId }, data: { active } });
  await logActivity("USUARIO", `${active ? "Ativou" : "Desativou"} o usuário ${target.name}`, me.id);

  revalidatePath("/usuarios");
  revalidatePath("/ticket-log");
  return { ok: true };
}

export async function changeUserRole(userId: string, role: Role): Promise<UserActionResult> {
  const me = await requireRole("MASTER");
  if (me.id === userId) {
    return { ok: false, error: "Você não pode alterar o próprio perfil." };
  }
  if (!ROLES.includes(role)) {
    return { ok: false, error: "Perfil inválido." };
  }

  const target = await prisma.user.update({ where: { id: userId }, data: { role } });
  await logActivity("USUARIO", `Alterou o perfil de ${target.name} para ${ROLE_LABELS[role]}`, me.id);

  revalidatePath("/usuarios");
  revalidatePath("/ticket-log");
  return { ok: true };
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<UserActionResult> {
  const me = await requireRole("MASTER");

  if (newPassword.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const target = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await logActivity("USUARIO", `Redefiniu a senha do usuário ${target.name}`, me.id);

  revalidatePath("/usuarios");
  revalidatePath("/ticket-log");
  return { ok: true };
}

const WIPE_CONFIRMATION_TEXT = "LIMPAR TUDO";

export interface WipeDatabaseResult extends UserActionResult {
  deleted?: { fuelRecords: number; vehicles: number; importBatches: number };
}

/**
 * Apaga todos os abastecimentos, lotes de importação e veículos — reset
 * total dos dados operacionais. Usuários e o próprio histórico de
 * atividades (Ticket Log) são preservados. Exige que o usuário digite a
 * frase de confirmação exata para reduzir o risco de exclusão acidental.
 */
export async function wipeDatabase(confirmText: string): Promise<WipeDatabaseResult> {
  const me = await requireRole("MASTER");

  if (confirmText.trim() !== WIPE_CONFIRMATION_TEXT) {
    return { ok: false, error: `Digite exatamente "${WIPE_CONFIRMATION_TEXT}" para confirmar.` };
  }

  const [fuelRecords] = await prisma.$transaction([
    prisma.fuelRecord.deleteMany({}),
    prisma.importBatch.deleteMany({}),
  ]);
  const vehicles = await prisma.vehicle.deleteMany({});

  await logActivity(
    "SISTEMA",
    `Limpou toda a base: ${fuelRecords.count} abastecimento(s), ${vehicles.count} veículo(s) removidos`,
    me.id,
  );

  revalidatePath("/");
  revalidatePath("/abastecimentos");
  revalidatePath("/pendencias");
  revalidatePath("/veiculos");
  revalidatePath("/metas");
  revalidatePath("/ticket-log");
  revalidatePath("/usuarios");
  revalidatePath("/exportar");

  return {
    ok: true,
    deleted: { fuelRecords: fuelRecords.count, vehicles: vehicles.count, importBatches: 0 },
  };
}
