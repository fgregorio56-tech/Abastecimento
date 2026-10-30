import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import { hasLevel, homeFor, isAdmin, parseModulos, type Level, type ModuleAccess, type ModuleKey } from "@/lib/permissions";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  modulos: ModuleAccess;
  supervisorId: string | null;
}

/**
 * Lê o usuário do banco a cada requisição (uma vez por requisição, via
 * `cache`), para que mudanças de permissão e desativações valham na hora,
 * sem esperar o login expirar.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, active: true, modulos: true, supervisorId: true },
  });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role === "MASTER" ? "MASTER" : "USUARIO") as Role,
    modulos: parseModulos(user.modulos),
    supervisorId: user.supervisorId,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user));
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) redirect(homeFor(user));
  return user;
}

/** Exige acesso ao módulo com pelo menos o nível informado. */
export async function requireModule(mod: ModuleKey, min: Level = "VIEWER") {
  const user = await requireUser();
  if (!hasLevel(user, mod, min)) redirect(homeFor(user));
  return user;
}
