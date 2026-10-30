import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/session";
import { isAdmin, levelOf, parseModulos, type EffectiveLevel } from "@/lib/permissions";

/**
 * Quem cada nível enxerga no Check de rotina:
 *   Administrador → todo mundo
 *   Visualizar    → todo mundo, só leitura
 *   Gestor        → ele e a equipe dele (quem tem ele como gestor)
 *   Incluir/editar→ só ele
 */
export interface EscopoRotina {
  nivel: EffectiveLevel;
  /** null = sem filtro (todo mundo). */
  ids: string[] | null;
  /** Pode marcar, desfazer e incluir extras para as pessoas do escopo. */
  podeRegistrar: boolean;
  /** Pode configurar (cadastrar, editar, pausar) rotinas das pessoas do escopo. */
  podeGerenciar: boolean;
  /** Pode excluir rotinas e extras das pessoas do escopo (Gestor e Administrador). */
  podeExcluir: boolean;
}

export async function escopoRotina(user: CurrentUser): Promise<EscopoRotina | null> {
  const nivel = levelOf(user, "ROTINA");
  if (!nivel) return null;

  if (nivel === "ADMIN") return { nivel, ids: null, podeRegistrar: true, podeGerenciar: true, podeExcluir: true };
  if (nivel === "VIEWER") return { nivel, ids: null, podeRegistrar: false, podeGerenciar: false, podeExcluir: false };
  if (nivel === "EDITOR") return { nivel, ids: [user.id], podeRegistrar: true, podeGerenciar: false, podeExcluir: false };

  const equipe = await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } });
  return { nivel, ids: [user.id, ...equipe.map((u) => u.id)], podeRegistrar: true, podeGerenciar: true, podeExcluir: true };
}

export function noEscopo(escopo: EscopoRotina, userId: string): boolean {
  return escopo.ids === null || escopo.ids.includes(userId);
}

export function filtroResponsavel(escopo: EscopoRotina) {
  return escopo.ids === null ? {} : { responsavelId: { in: escopo.ids } };
}

export interface PessoaRotina {
  id: string;
  nome: string;
}

/**
 * Pessoas que podem ser responsáveis por rotinas dentro do escopo: usuários
 * ativos com o módulo Rotinas liberado (ou administradores).
 */
export async function pessoasDoEscopo(escopo: EscopoRotina): Promise<PessoaRotina[]> {
  const users = await prisma.user.findMany({
    where: { active: true, ...(escopo.ids === null ? {} : { id: { in: escopo.ids } }) },
    select: { id: true, name: true, role: true, modulos: true },
    orderBy: { name: "asc" },
  });
  return users
    .filter((u) => isAdmin(u) || parseModulos(u.modulos).ROTINA)
    .map((u) => ({ id: u.id, nome: u.name }));
}
