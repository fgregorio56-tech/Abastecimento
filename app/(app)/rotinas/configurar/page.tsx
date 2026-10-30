import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { escopoRotina, filtroResponsavel, pessoasDoEscopo } from "@/lib/rotinas";
import { RotinasConfig, type RotinaConfig } from "./RotinasConfig";

export default async function ConfigurarRotinasPage() {
  const user = await requireModule("ROTINA", "EDITOR");
  const escopo = (await escopoRotina(user))!;

  const [rotinas, pessoas] = await Promise.all([
    prisma.rotina.findMany({
      where: filtroResponsavel(escopo),
      include: { responsavel: { select: { name: true } } },
      orderBy: [{ ativo: "desc" }, { horario: "asc" }, { titulo: "asc" }],
    }),
    pessoasDoEscopo(escopo),
  ]);

  const dados: RotinaConfig[] = rotinas
    .map((r) => ({
      id: r.id,
      titulo: r.titulo,
      local: r.local,
      horario: r.horario,
      frequencia: r.frequencia,
      diasSemana: r.diasSemana,
      diaMes: r.diaMes,
      ativo: r.ativo,
      responsavelId: r.responsavelId,
      criadaPorMim: r.createdById === user.id,
      responsavel: r.responsavel.name,
    }))
    .sort((a, b) => a.responsavel.localeCompare(b.responsavel, "pt-BR"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurar rotinas</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Cada rotina aparece no Check do dia do responsável conforme a frequência, a partir da data de cadastro.
          {!escopo.podeGerenciar &&
            " Aqui você cadastra as suas rotinas e edita as que você mesmo criou. Para pausar, transferir ou excluir, fale com o seu gestor."}
          {escopo.podeGerenciar &&
            escopo.ids !== null &&
            " Como gestor, você vê e configura as suas rotinas e as da sua equipe (pessoas que têm você como gestor): pode editar, pausar, transferir para outra pessoa da equipe ou excluir."}
        </p>
      </div>
      <RotinasConfig
        rotinas={dados}
        pessoas={pessoas}
        meuId={user.id}
        podeGerenciar={escopo.podeGerenciar}
        podeExcluir={escopo.podeExcluir}
      />
    </div>
  );
}
