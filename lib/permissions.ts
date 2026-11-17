/**
 * Acesso por módulo.
 *
 * - Perfil "MASTER" (Administrador): acesso total a todos os módulos, gerencia
 *   usuários e permissões.
 * - Perfil "USUARIO": enxerga só os módulos liberados em `User.modulos`, cada
 *   um com o seu nível:
 *     VIEWER     → Visualizar
 *     EDITOR     → Incluir e editar
 *     SUPERVISOR → No Abastecimento, também exclui. No Check de rotina,
 *                  responde pela equipe que tem ele como supervisor, mas não
 *                  exclui: lá só o Administrador exclui.
 *
 * Este arquivo não importa nada do servidor, então pode ser usado tanto em
 * componentes de servidor quanto de cliente.
 */

export const MODULES = ["ABASTECIMENTO", "ROTINA", "PLANEJAMENTO"] as const;
export type ModuleKey = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  ABASTECIMENTO: "Abastecimento",
  ROTINA: "Check de rotina",
  PLANEJAMENTO: "Meu planejamento",
};

/** Página inicial de cada módulo. */
export const MODULE_HOME: Record<ModuleKey, string> = {
  ABASTECIMENTO: "/dashboard",
  ROTINA: "/rotinas",
  PLANEJAMENTO: "/planejamento",
};

/** Descrição de cada módulo nos cartões da página inicial (Portal). */
export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  ABASTECIMENTO: "Consumo, quilometragem, veículos, metas e pendências da frota.",
  ROTINA: "Check diário das atividades da equipe e resumo por período.",
  PLANEJAMENTO: "Metas, projetos e aportes de cada pessoa. Cada um vê e edita só o seu.",
};

export const MODULE_ICONS: Record<ModuleKey, string> = {
  ABASTECIMENTO: "⛽",
  ROTINA: "✅",
  PLANEJAMENTO: "🎯",
};

export const LEVELS = ["VIEWER", "EDITOR", "SUPERVISOR"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  VIEWER: "Visualizar",
  EDITOR: "Incluir e editar",
  SUPERVISOR: "Supervisor (também exclui)",
};

/** Rótulo do nível dentro de um módulo (o Supervisor só exclui no Abastecimento). */
export function levelLabel(m: ModuleKey, l: Level): string {
  if (l === "SUPERVISOR" && m === "ROTINA") return "Supervisor (equipe)";
  if (m === "PLANEJAMENTO") return "Acesso ao próprio planejamento";
  return LEVEL_LABELS[l];
}

/**
 * Níveis oferecidos na tela de usuários. No Meu planejamento só há um: quem
 * tem acesso inclui, edita e exclui o próprio planejamento; o Administrador vê
 * e edita o de todos.
 */
export function levelsFor(m: ModuleKey): readonly Level[] {
  return m === "PLANEJAMENTO" ? ["EDITOR"] : LEVELS;
}

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
  // O Portal (/) lista os módulos liberados; sem nenhum, não há o que mostrar.
  return visibleModules(user).length > 0 || isAdmin(user) ? "/" : "/sem-acesso";
}
