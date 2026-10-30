"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { escopoRotina, noEscopo, pessoasDoEscopo } from "@/lib/rotinas";
import {
  MOTIVOS_NAO_EXECUCAO,
  descreverFrequencia,
  diaValido,
  hoje,
  paraData,
  type StatusRegistro,
} from "@/lib/rotinas-shared";

export interface RotinaResult {
  ok: boolean;
  error?: string;
}

function revalidarRotinas() {
  revalidatePath("/rotinas");
  revalidatePath("/rotinas/resumo");
  revalidatePath("/rotinas/configurar");
}

function texto(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Check do dia                                                        */
/* ------------------------------------------------------------------ */

export async function marcarRotina(input: {
  rotinaId: string;
  data: string;
  status: StatusRegistro;
  motivo?: string;
  justificativa?: string;
}): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "EDITOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeRegistrar) return { ok: false, error: "Seu acesso às rotinas é só de visualização." };

  if (!diaValido(input.data)) return { ok: false, error: "Data inválida." };
  if (input.data > hoje()) return { ok: false, error: "Não dá para registrar um dia que ainda não chegou." };
  if (input.status !== "FEITO" && input.status !== "NAO_FEITO") return { ok: false, error: "Situação inválida." };

  const motivo = texto(input.motivo, 120);
  const justificativa = texto(input.justificativa, 500);
  if (input.status === "NAO_FEITO") {
    if (!(MOTIVOS_NAO_EXECUCAO as readonly string[]).includes(motivo)) {
      return { ok: false, error: "Escolha o motivo da não execução." };
    }
    if (motivo === "Outro" && !justificativa) return { ok: false, error: "Descreva o motivo." };
  }

  const rotina = await prisma.rotina.findUnique({ where: { id: input.rotinaId }, select: { responsavelId: true } });
  if (!rotina) return { ok: false, error: "Rotina não encontrada. Atualize a página." };
  if (!noEscopo(escopo, rotina.responsavelId)) return { ok: false, error: "Esta rotina não está no seu acesso." };

  const dados = {
    status: input.status,
    motivo: input.status === "NAO_FEITO" ? motivo : null,
    justificativa: input.status === "NAO_FEITO" ? justificativa || null : null,
    responsavelId: rotina.responsavelId,
    registradoPorId: user.id,
  };
  // Uma linha por rotina por dia: duas pessoas marcando ao mesmo tempo não
  // duplicam, a última gravação vale.
  await prisma.rotinaRegistro.upsert({
    where: { rotinaId_data: { rotinaId: input.rotinaId, data: paraData(input.data) } },
    create: { rotinaId: input.rotinaId, data: paraData(input.data), ...dados },
    update: dados,
  });

  revalidarRotinas();
  return { ok: true };
}

export async function desfazerRegistro(input: { rotinaId: string; data: string }): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "EDITOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeRegistrar) return { ok: false, error: "Seu acesso às rotinas é só de visualização." };
  if (!diaValido(input.data)) return { ok: false, error: "Data inválida." };

  const where = { rotinaId_data: { rotinaId: input.rotinaId, data: paraData(input.data) } };
  const reg = await prisma.rotinaRegistro.findUnique({ where, select: { responsavelId: true } });
  if (!reg) return { ok: true };
  if (!noEscopo(escopo, reg.responsavelId)) return { ok: false, error: "Este registro não está no seu acesso." };

  await prisma.rotinaRegistro.delete({ where });
  revalidarRotinas();
  return { ok: true };
}

export async function adicionarExtra(input: {
  data: string;
  descricao: string;
  observacao?: string;
  responsavelId?: string;
}): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "EDITOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeRegistrar) return { ok: false, error: "Seu acesso às rotinas é só de visualização." };
  if (!diaValido(input.data)) return { ok: false, error: "Data inválida." };
  if (input.data > hoje()) return { ok: false, error: "Não dá para registrar um dia que ainda não chegou." };

  const descricao = texto(input.descricao, 200);
  if (!descricao) return { ok: false, error: "Descreva a atividade extra." };
  const responsavelId = input.responsavelId || user.id;
  if (!noEscopo(escopo, responsavelId)) return { ok: false, error: "Você só registra extras da sua equipe." };

  await prisma.rotinaExtra.create({
    data: {
      data: paraData(input.data),
      descricao,
      observacao: texto(input.observacao, 300) || null,
      responsavelId,
      registradoPorId: user.id,
    },
  });
  revalidarRotinas();
  return { ok: true };
}

export async function excluirExtra(id: string): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "SUPERVISOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeExcluir) return { ok: false, error: "Só o gestor da equipe e o Administrador excluem." };

  const extra = await prisma.rotinaExtra.findUnique({ where: { id }, select: { responsavelId: true, descricao: true } });
  if (!extra) return { ok: true };
  if (!noEscopo(escopo, extra.responsavelId)) return { ok: false, error: "Esta atividade não está no seu acesso." };

  await prisma.rotinaExtra.delete({ where: { id } });
  await logActivity("ROTINA", `Excluiu a atividade extra "${extra.descricao}"`, user.id);
  revalidarRotinas();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Configuração das rotinas (Gestor da equipe e Administrador)         */
/* ------------------------------------------------------------------ */

export async function salvarRotina(input: {
  id?: string;
  titulo: string;
  local?: string;
  horario?: string;
  frequencia: string;
  diasSemana: number[];
  diaMes?: number | null;
  responsavelId: string;
}): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "SUPERVISOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeGerenciar) return { ok: false, error: "Só o gestor da equipe e o Administrador configuram rotinas." };

  const titulo = texto(input.titulo, 140);
  if (!titulo) return { ok: false, error: "Informe a atividade." };
  const frequencia = input.frequencia === "MENSAL" ? "MENSAL" : "SEMANAL";
  const diasSemana = [...new Set((input.diasSemana ?? []).map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  const diaMes = Number(input.diaMes);
  if (frequencia === "SEMANAL" && diasSemana.length === 0) return { ok: false, error: "Marque pelo menos um dia da semana." };
  if (frequencia === "MENSAL" && !(Number.isInteger(diaMes) && diaMes >= 1 && diaMes <= 31)) {
    return { ok: false, error: "O dia do mês deve ser de 1 a 31." };
  }
  const horario = /^\d{2}:\d{2}$/.test(input.horario ?? "") ? input.horario! : null;

  const pessoas = await pessoasDoEscopo(escopo);
  const responsavel = pessoas.find((p) => p.id === input.responsavelId);
  if (!responsavel) return { ok: false, error: "Escolha um responsável da sua equipe com acesso às rotinas." };

  const dados = {
    titulo,
    local: texto(input.local, 140) || null,
    horario,
    frequencia,
    diasSemana: frequencia === "SEMANAL" ? diasSemana : [],
    diaMes: frequencia === "MENSAL" ? diaMes : null,
    responsavelId: responsavel.id,
  };

  if (input.id) {
    const atual = await prisma.rotina.findUnique({ where: { id: input.id }, select: { responsavelId: true } });
    if (!atual) return { ok: false, error: "Rotina não encontrada." };
    if (!noEscopo(escopo, atual.responsavelId)) return { ok: false, error: "Esta rotina não está no seu acesso." };
    await prisma.rotina.update({ where: { id: input.id }, data: dados });
    await logActivity("ROTINA", `Alterou a rotina "${titulo}" de ${responsavel.nome}`, user.id);
  } else {
    await prisma.rotina.create({ data: { ...dados, inicio: paraData(hoje()), createdById: user.id } });
    await logActivity(
      "ROTINA",
      `Criou a rotina "${titulo}" para ${responsavel.nome} (${descreverFrequencia(dados)})`,
      user.id,
    );
  }

  revalidarRotinas();
  return { ok: true };
}

export async function alternarRotina(id: string, ativo: boolean): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "SUPERVISOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeGerenciar) return { ok: false, error: "Sem permissão." };

  const r = await prisma.rotina.findUnique({ where: { id }, select: { responsavelId: true, titulo: true } });
  if (!r) return { ok: false, error: "Rotina não encontrada." };
  if (!noEscopo(escopo, r.responsavelId)) return { ok: false, error: "Esta rotina não está no seu acesso." };

  await prisma.rotina.update({ where: { id }, data: { ativo } });
  await logActivity("ROTINA", `${ativo ? "Reativou" : "Pausou"} a rotina "${r.titulo}"`, user.id);
  revalidarRotinas();
  return { ok: true };
}

export async function excluirRotina(id: string): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "SUPERVISOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeExcluir) return { ok: false, error: "Só o gestor da equipe e o Administrador excluem." };

  const r = await prisma.rotina.findUnique({ where: { id }, select: { responsavelId: true, titulo: true } });
  if (!r) return { ok: true };
  if (!noEscopo(escopo, r.responsavelId)) return { ok: false, error: "Esta rotina não está no seu acesso." };

  // Os registros dessa rotina saem junto (onDelete: Cascade).
  await prisma.rotina.delete({ where: { id } });
  await logActivity("ROTINA", `Excluiu a rotina "${r.titulo}" e o histórico dela`, user.id);
  revalidarRotinas();
  return { ok: true };
}

/**
 * Passa a rotina para outra pessoa do escopo. O histórico já registrado
 * continua no nome de quem fez (cada registro guarda o seu responsável);
 * daqui para frente a rotina aparece no Check do dia do novo responsável.
 */
export async function transferirRotina(id: string, novoResponsavelId: string): Promise<RotinaResult> {
  const user = await requireModule("ROTINA", "SUPERVISOR");
  const escopo = await escopoRotina(user);
  if (!escopo?.podeGerenciar) return { ok: false, error: "Só o gestor da equipe e o Administrador transferem rotinas." };

  const r = await prisma.rotina.findUnique({
    where: { id },
    select: { responsavelId: true, titulo: true, responsavel: { select: { name: true } } },
  });
  if (!r) return { ok: false, error: "Rotina não encontrada." };
  if (!noEscopo(escopo, r.responsavelId)) return { ok: false, error: "Esta rotina não está no seu acesso." };
  if (r.responsavelId === novoResponsavelId) return { ok: true };

  const pessoas = await pessoasDoEscopo(escopo);
  const novo = pessoas.find((p) => p.id === novoResponsavelId);
  if (!novo) return { ok: false, error: "Escolha alguém da sua equipe com acesso às rotinas." };

  await prisma.rotina.update({ where: { id }, data: { responsavelId: novo.id } });
  await logActivity("ROTINA", `Transferiu a rotina "${r.titulo}" de ${r.responsavel.name} para ${novo.nome}`, user.id);
  revalidarRotinas();
  return { ok: true };
}
