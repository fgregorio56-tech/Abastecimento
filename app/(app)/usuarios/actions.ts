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
