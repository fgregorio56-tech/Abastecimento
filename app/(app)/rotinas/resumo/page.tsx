import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { escopoRotina, filtroResponsavel } from "@/lib/rotinas";
import {
  deData,
  diaValido,
  formatarDiaCurto,
  hoje,
  paraData,
  programadaNoDia,
  somarDias,
} from "@/lib/rotinas-shared";
import { DateNav } from "../DateNav";

const PERIODOS = [7, 15, 30] as const;

interface Linha {
  id: string;
  nome: string;
  prog: number;
  feito: number;
  nao: number;
  sem: number;
  futuro: number;
  extras: number;
}

export default async function ResumoRotinasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireModule("ROTINA");
  const escopo = (await escopoRotina(user))!;
  const params = await searchParams;
  const hj = hoje();
  const fim = diaValido(params.data) ? params.data : hj;
  const dias = PERIODOS.includes(Number(params.dias) as (typeof PERIODOS)[number]) ? Number(params.dias) : 7;
  const inicio = somarDias(fim, -(dias - 1));
  const filtro = filtroResponsavel(escopo);
  const intervalo = { gte: paraData(inicio), lte: paraData(fim) };

  const [rotinas, registros, extras] = await Promise.all([
    prisma.rotina.findMany({ where: filtro, include: { responsavel: { select: { name: true } } } }),
    prisma.rotinaRegistro.findMany({
      where: { ...filtro, data: intervalo },
      include: { rotina: { select: { titulo: true } }, responsavel: { select: { name: true } } },
    }),
    prisma.rotinaExtra.findMany({
      where: { ...filtro, data: intervalo },
      include: { responsavel: { select: { name: true } } },
    }),
  ]);

  const regMap = new Map(registros.map((g) => [`${deData(g.data)}_${g.rotinaId}`, g]));
  const linhas = new Map<string, Linha>();
  const linha = (id: string, nome: string) => {
    if (!linhas.has(id)) linhas.set(id, { id, nome, prog: 0, feito: 0, nao: 0, sem: 0, futuro: 0, extras: 0 });
    return linhas.get(id)!;
  };

  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    for (const r of rotinas) {
      const g = regMap.get(`${d}_${r.id}`);
      const agenda = { frequencia: r.frequencia, diasSemana: r.diasSemana, diaMes: r.diaMes, inicio: deData(r.inicio) };
      // Rotina pausada só conta nos dias em que ainda teve registro.
      if (!g && (!r.ativo || !programadaNoDia(agenda, d))) continue;
      const l = linha(r.responsavelId, r.responsavel.name);
      l.prog++;
      if (g?.status === "FEITO") l.feito++;
      else if (g?.status === "NAO_FEITO") l.nao++;
      else if (d <= hj) l.sem++;
      else l.futuro++;
    }
  }
  for (const x of extras) linha(x.responsavelId, x.responsavel.name).extras++;

  const pessoas = [...linhas.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const total = pessoas.reduce(
    (t, p) => ({
      prog: t.prog + p.prog,
      feito: t.feito + p.feito,
      nao: t.nao + p.nao,
      sem: t.sem + p.sem,
      futuro: t.futuro + p.futuro,
      extras: t.extras + p.extras,
    }),
    { prog: 0, feito: 0, nao: 0, sem: 0, futuro: 0, extras: 0 },
  );

  const naoFeitos = registros
    .filter((g) => g.status === "NAO_FEITO")
    .sort((a, b) => b.data.getTime() - a.data.getTime() || b.updatedAt.getTime() - a.updatedAt.getTime());
  const motivos = [...naoFeitos.reduce((m, g) => m.set(g.motivo ?? "Sem motivo", (m.get(g.motivo ?? "Sem motivo") ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);
  const maxMotivo = motivos[0]?.[1] ?? 1;

  const adesao = (l: Pick<Linha, "prog" | "futuro" | "feito">) => {
    const base = l.prog - l.futuro;
    return base > 0 ? Math.round((l.feito / base) * 100) : null;
  };

  function hrefPeriodo(n: number) {
    const sp = new URLSearchParams();
    if (fim !== hj) sp.set("data", fim);
    if (n !== 7) sp.set("dias", String(n));
    const qs = sp.toString();
    return qs ? `/rotinas/resumo?${qs}` : "/rotinas/resumo";
  }

  const th = "sticky top-0 whitespace-nowrap bg-slate-50 px-3 py-2";
  const num = "px-3 py-2 text-right tabular-nums";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resumo das rotinas</h1>
          <p className="text-sm text-slate-500">
            {formatarDiaCurto(inicio)} a {formatarDiaCurto(fim)}
            {escopo.ids !== null && (escopo.nivel === "SUPERVISOR" ? " · você e sua equipe (gestor)" : " · suas rotinas")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Período">
            {PERIODOS.map((n) => (
              <Link
                key={n}
                href={hrefPeriodo(n)}
                aria-current={n === dias ? "true" : undefined}
                className={`px-3 py-1.5 text-sm font-medium ${n === dias ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {n} dias
              </Link>
            ))}
          </div>
          <DateNav dia={fim} hoje={hj} />
        </div>
      </div>

      {pessoas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Nenhuma rotina ou atividade extra neste período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className={th}>Responsável</th>
                <th className={`${th} text-right`}>Programadas</th>
                <th className={`${th} text-right`}>Feitas</th>
                <th className={`${th} text-right`}>Não feitas</th>
                <th className={`${th} text-right`}>Sem registro</th>
                <th className={`${th} text-right`}>Extras</th>
                <th className={`${th} text-right`}>Adesão</th>
              </tr>
            </thead>
            <tbody>
              {[...pessoas, { ...total, id: "__total", nome: "Total" }].map((p) => {
                const a = adesao(p);
                const isTotal = p.id === "__total";
                return (
                  <tr key={p.id} className={`border-b border-slate-100 ${isTotal ? "font-semibold" : ""}`}>
                    <td className="px-3 py-2">{p.nome}</td>
                    <td className={num}>{p.prog}</td>
                    <td className={`${num} text-brand-700`}>{p.feito}</td>
                    <td className={`${num} text-amber-700`}>{p.nao}</td>
                    <td className={`${num} ${p.sem > 0 ? "text-red-600" : ""}`}>{p.sem}</td>
                    <td className={num}>{p.extras}</td>
                    <td className={num}>
                      <div className="flex items-center justify-end gap-2">
                        <span>{a === null ? "—" : `${a}%`}</span>
                        <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                          <span className="block h-full bg-brand-500" style={{ width: `${a ?? 0}%` }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="-mt-3 text-xs text-slate-500">
        Adesão = feitas ÷ programadas até hoje. &ldquo;Sem registro&rdquo; são rotinas que passaram sem check nem justificativa.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Motivos de não execução</h2>
          {motivos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma justificativa no período.</p>
          ) : (
            motivos.map(([motivo, n]) => (
              <div key={motivo} className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{motivo}</span>
                  <span className="tabular-nums text-slate-500">{n}</span>
                </div>
                <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <span className="block h-full bg-amber-500" style={{ width: `${(n / maxMotivo) * 100}%` }} />
                </span>
              </div>
            ))
          )}
        </section>
        <section className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Justificativas registradas</h2>
          {naoFeitos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma justificativa no período.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {naoFeitos.slice(0, 60).map((g) => (
                <li key={g.id} className="flex flex-col gap-1 py-2 text-sm">
                  <span>
                    <span className="tabular-nums text-slate-500">{formatarDiaCurto(deData(g.data))}</span> ·{" "}
                    <strong>{g.rotina.titulo}</strong> · {g.responsavel.name}
                  </span>
                  <span className="text-slate-700">
                    <span className="mr-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {g.motivo ?? "Sem motivo"}
                    </span>
                    {g.justificativa}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
