"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import type { ResultadoSalvar } from "./MetasProjetos";

const TAMANHO_MAXIMO = 2_000_000; // ~2 MB de JSON por pessoa

/**
 * Grava o planejamento inteiro de `donoId`. O `donoId` chega do navegador
 * (via bind), então a regra de quem pode gravar é conferida aqui: cada um só
 * o seu; o Administrador, o de qualquer pessoa.
 */
export async function salvarPlanejamento(donoId: string, estado: unknown): Promise<ResultadoSalvar> {
  const user = await requireModule("PLANEJAMENTO");
  if (donoId !== user.id && !isAdmin(user)) {
    return { ok: false, error: "Você só altera o seu próprio planejamento." };
  }

  const e = estado as Record<string, unknown> | null;
  const valido =
    !!e &&
    typeof e === "object" &&
    !!e.config &&
    typeof e.config === "object" &&
    Array.isArray(e.projetos) &&
    Array.isArray(e.aportes) &&
    Array.isArray(e.parcelas);
  if (!valido) return { ok: false, error: "Dados do planejamento inválidos." };

  const json = JSON.stringify({ config: e.config, projetos: e.projetos, aportes: e.aportes, parcelas: e.parcelas });
  if (json.length > TAMANHO_MAXIMO) {
    return { ok: false, error: "Planejamento grande demais para salvar." };
  }
  const dados = JSON.parse(json) as Prisma.InputJsonObject;

  const dono = await prisma.user.findUnique({ where: { id: donoId }, select: { id: true } });
  if (!dono) return { ok: false, error: "Usuário não encontrado." };

  await prisma.planejamento.upsert({
    where: { userId: donoId },
    create: { userId: donoId, dados },
    update: { dados },
  });
  return { ok: true };
}
