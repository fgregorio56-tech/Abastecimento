"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import {
  LEVELS,
  levelLabel,
  MODULES,
  MODULE_LABELS,
  parseModulos,
  type Level,
  type ModuleAccess,
  type ModuleKey,
} from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";

export interface UserActionResult {
  ok: boolean;
  error?: string;
}

export type CreateUserState = UserActionResult;

const LOGIN_RE = /^[a-z0-9._@-]{3,80}$/;

function parseLevel(value: unknown): Level | null {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value) ? (value as Level) : null;
}

function buildModulos(input: Partial<Record<ModuleKey, string | null | undefined>>): ModuleAccess {
  const out: ModuleAccess = {};
  for (const mod of MODULES) {
    const lvl = parseLevel(input[mod]);
    if (lvl) out[mod] = lvl;
  }
  return out;
}

function describeAccess(role: Role, modulos: ModuleAccess) {
  if (role === "MASTER") return ROLE_LABELS.MASTER;
  const parts = MODULES.filter((m) => modulos[m]).map((m) => `${MODULE_LABELS[m]}: ${levelLabel(m, modulos[m]!)}`);
  return parts.length ? parts.join(" · ") : "sem módulos";
}

/** O supervisor escolhido precisa ser Administrador ou Supervisor do módulo Rotinas. */
async function validSupervisor(supervisorId: string | null, userId?: string): Promise<string | null> {
  if (!supervisorId) return null;
  if (userId && supervisorId === userId) throw new Error("A pessoa não pode ser supervisora de si mesma.");
  const sup = await prisma.user.findUnique({ where: { id: supervisorId }, select: { role: true, modulos: true, active: true } });
  if (!sup || !sup.active) throw new Error("Supervisor não encontrado.");
  const ok = sup.role === "MASTER" || parseModulos(sup.modulos).ROTINA === "SUPERVISOR";
  if (!ok) throw new Error("O supervisor escolhido precisa ter nível Supervisor no módulo Rotinas.");
  return supervisorId;
}

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const me = await requireRole("MASTER");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role: Role = formData.get("role") === "MASTER" ? "MASTER" : "USUARIO";
  const modulos =
    role === "MASTER"
      ? {}
      : buildModulos({
          ABASTECIMENTO: String(formData.get("mod_ABASTECIMENTO") ?? ""),
          ROTINA: String(formData.get("mod_ROTINA") ?? ""),
        });

  if (!name || !email || !password) {
    return { ok: false, error: "Preencha nome, usuário de acesso e senha." };
  }
  if (!LOGIN_RE.test(email)) {
    return { ok: false, error: "O usuário de acesso deve ser um e-mail ou um nome sem espaços (letras, números, ponto, hífen)." };
  }
  if (password.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (role !== "MASTER" && Object.keys(modulos).length === 0) {
    return { ok: false, error: "Libere pelo menos um módulo para a pessoa." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Já existe um usuário com esse login." };
  }

  let supervisorId: string | null;
  try {
    supervisorId = await validSupervisor(String(formData.get("supervisorId") ?? "") || null);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role, modulos, supervisorId } });

  await logActivity("USUARIO", `Criou o usuário ${name} (${describeAccess(role, modulos)})`, me.id);

  revalidatePath("/usuarios");
  revalidatePath("/ticket-log");
  return { ok: true };
}

export async function updateUserAccess(
  userId: string,
  input: { role: string; modulos: Partial<Record<ModuleKey, string | null>>; supervisorId: string | null },
): Promise<UserActionResult> {
  const me = await requireRole("MASTER");

  const role: Role = input.role === "MASTER" ? "MASTER" : "USUARIO";
  if (me.id === userId && role !== "MASTER") {
    return { ok: false, error: "Você não pode tirar o seu próprio acesso de administrador." };
  }
  const modulos = role === "MASTER" ? {} : buildModulos(input.modulos);

  let supervisorId: string | null;
  try {
    supervisorId = await validSupervisor(input.supervisorId || null, userId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const target = await prisma.user.update({ where: { id: userId }, data: { role, modulos, supervisorId } });

  // Quem deixou de ser supervisor das Rotinas não pode continuar como
  // supervisor de ninguém.
  if (role !== "MASTER" && modulos.ROTINA !== "SUPERVISOR") {
    await prisma.user.updateMany({ where: { supervisorId: userId }, data: { supervisorId: null } });
  }

  await logActivity("USUARIO", `Alterou o acesso de ${target.name}: ${describeAccess(role, modulos)}`, me.id);

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
