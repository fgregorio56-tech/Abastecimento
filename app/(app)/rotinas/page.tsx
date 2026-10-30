import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { escopoRotina, filtroResponsavel, pessoasDoEscopo } from "@/lib/rotinas";
import { deData, diaValido, hoje, paraData, programadaNoDia } from "@/lib/rotinas-shared";
import { DayView, type ExtraDia, type RegistroDia, type RotinaDia } from "./DayView";

export default async function RotinasDoDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireModule("ROTINA");
  const escopo = (await escopoRotina(user))!;
  const params = await searchParams;
  const dia = diaValido(params.data) ? params.data : hoje();
  const data = paraData(dia);
  const filtro = filtroResponsavel(escopo);

  const [rotinas, registros, extras, pessoas] = await Promise.all([
    // Ativas, ou pausadas que já tinham registro nesse dia (para não sumir do histórico).
    prisma.rotina.findMany({
      where: { ...filtro, OR: [{ ativo: true }, { registros: { some: { data } } }] },
      include: { responsavel: { select: { name: true } } },
    }),
    prisma.rotinaRegistro.findMany({
      where: { ...filtro, data },
      include: { registradoPor: { select: { name: true } } },
    }),
    prisma.rotinaExtra.findMany({
      where: { ...filtro, data },
      include: { responsavel: { select: { name: true } }, registradoPor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    pessoasDoEscopo(escopo),
  ]);

  const comRegistro = new Set(registros.map((r) => r.rotinaId));
  const rotinasDia: RotinaDia[] = rotinas
    .filter((r) => {
      const agenda = { frequencia: r.frequencia, diasSemana: r.diasSemana, diaMes: r.diaMes, inicio: deData(r.inicio) };
      return comRegistro.has(r.id) || programadaNoDia(agenda, dia);
    })
    .map((r) => ({
      id: r.id,
      titulo: r.titulo,
      local: r.local,
      horario: r.horario,
      responsavelId: r.responsavelId,
      responsavel: r.responsavel.name,
    }));

  const registrosDia: RegistroDia[] = registros.map((g) => ({
    rotinaId: g.rotinaId,
    status: g.status as RegistroDia["status"],
    motivo: g.motivo,
    justificativa: g.justificativa,
    por: g.registradoPor?.name ?? null,
    em: g.updatedAt.toISOString(),
  }));

  const extrasDia: ExtraDia[] = extras.map((x) => ({
    id: x.id,
    descricao: x.descricao,
    observacao: x.observacao,
    responsavelId: x.responsavelId,
    responsavel: x.responsavel.name,
    por: x.registradoPor?.name ?? null,
    em: x.createdAt.toISOString(),
  }));

  return (
    <DayView
      dia={dia}
      hoje={hoje()}
      meuId={user.id}
      rotinas={rotinasDia}
      registros={registrosDia}
      extras={extrasDia}
      pessoas={pessoas}
      podeRegistrar={escopo.podeRegistrar}
      podeGerenciar={escopo.podeGerenciar}
      podeIncluir={escopo.podeIncluir}
      podeExcluir={escopo.podeExcluir}
    />
  );
}
