/**
 * Acesso por módulo.
 *
 * - Perfil "MASTER" (Administrador): acesso total a todos os módulos, gerencia
 *   usuários e permissões.
 * - Perfil "USUARIO": enxerga só os módulos liberados em `User.modulos`, cada
 *   um com o seu nível:
 *     VIEWER     → Visualizar
 *     EDITOR     → Incluir e editar
 *     SUPERVISOR → Incluir, editar e excluir (no módulo Rotinas, também
 *                  responde pela equipe que tem ele como supervisor)
 *
 * Este arquivo não importa nada do servidor, então pode ser usado tanto em
 * componentes de servidor quanto de cliente.
 */

export const MODULES = ["ABASTECIMENTO", "ROTINA"] as const;
export type ModuleKey = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  ABASTECIMENTO: "Abastecimento",
  ROTINA: "Check de rotina",
};

/** Página inicial de cada módulo. */
export const MODULE_HOME: Record<ModuleKey, string> = {
  ABASTECIMENTO: "/",
  ROTINA: "/rotinas",
};

export const LEVELS = ["VIEWER", "EDITOR", "SUPERVISOR"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  VIEWER: "Visualizar",
  EDITOR: "Incluir e editar",
  SUPERVISOR: "Supervisor (também exclui)",
};

/** Nível efetivo: o Administrador fica acima de todos. */
export type EffectiveLevel = Level | "ADMIN";

const RANK: Record<EffectiveLevel, number> = { VIEWER: 1, EDITOR: 2, SUPERVISOR: 3, ADMIN: 4 };

export type ModuleAccess = Partial<Record<ModuleKey, Level>>;

export interface AccessSubject {
  role: string;
  modulos: ModuleAccess;
}

export function isAdmin(user: { role: string } | null | undefined): boolean {
  return user?.role === "MASTER";
}

/** Converte o JSON salvo no banco num mapa válido, ignorando valores estranhos. */
export function parseModulos(value: unknown): ModuleAccess {
  const out: ModuleAccess = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const mod of MODULES) {
    const lvl = (value as Record<string, unknown>)[mod];
    if (typeof lvl === "string" && (LEVELS as readonly string[]).includes(lvl)) {
      out[mod] = lvl as Level;
    }
  }
  return out;
}

export function levelOf(user: AccessSubject | null | undefined, mod: ModuleKey): EffectiveLevel | null {
  if (!user) return null;
  if (isAdmin(user)) return "ADMIN";
  return user.modulos[mod] ?? null;
}

/** O usuário tem pelo menos esse nível no módulo? */
export function hasLevel(user: AccessSubject | null | undefined, mod: ModuleKey, min: Level): boolean {
  const lvl = levelOf(user, mod);
  return lvl !== null && RANK[lvl] >= RANK[min];
}

export const canView = (u: AccessSubject | null | undefined, m: ModuleKey) => hasLevel(u, m, "VIEWER");
export const canEdit = (u: AccessSubject | null | undefined, m: ModuleKey) => hasLevel(u, m, "EDITOR");
export const canDelete = (u: AccessSubject | null | undefined, m: ModuleKey) => hasLevel(u, m, "SUPERVISOR");

/** Módulos que o usuário enxerga, na ordem do menu. */
export function visibleModules(user: AccessSubject | null | undefined): ModuleKey[] {
  return MODULES.filter((m) => canView(user, m));
}

/** Para onde mandar o usuário quando ele cai numa página sem acesso. */
export function homeFor(user: AccessSubject | null | undefined): string {
  const first = visibleModules(user)[0];
  return first ? MODULE_HOME[first] : "/sem-acesso";
}
