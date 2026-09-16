"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ROLES, type Role } from "@/lib/roles";

export interface UserActionResult {
  ok: boolean;
  error?: string;
}

export type CreateUserState = UserActionResult;

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireRole("MASTER");

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

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function toggleUserActive(userId: string, active: boolean): Promise<UserActionResult> {
  const me = await requireRole("MASTER");
  if (me.id === userId) {
    return { ok: false, error: "Você não pode desativar seu próprio usuário." };
  }

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/usuarios");
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

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<UserActionResult> {
  await requireRole("MASTER");

  if (newPassword.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  revalidatePath("/usuarios");
  return { ok: true };
}
