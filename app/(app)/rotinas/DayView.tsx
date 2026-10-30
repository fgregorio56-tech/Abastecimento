"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MOTIVOS_NAO_EXECUCAO, formatarDiaLongo, horaBahia, type StatusRegistro } from "@/lib/rotinas-shared";
import { adicionarExtra, desfazerRegistro, excluirExtra, marcarRotina } from "./actions";
import { DateNav } from "./DateNav";

export interface RotinaDia {
  id: string;
  titulo: string;
  local: string | null;
  horario: string | null;
  responsavelId: string;
  responsavel: string;
}

export interface RegistroDia {
  rotinaId: string;
  status: StatusRegistro;
  motivo: string | null;
  justificativa: string | null;
  por: string | null;
  em: string;
}

export interface ExtraDia {
  id: string;
  descricao: string;
  observacao: string | null;
  responsavelId: string;
  responsavel: string;
  por: string | null;
  em: string;
}

interface Props {
  dia: string;
  hoje: string;
  meuId: string;
  rotinas: RotinaDia[];
  registros: RegistroDia[];
  extras: ExtraDia[];
  pessoas: { id: string; nome: string }[];
  podeRegistrar: boolean;
  podeGerenciar: boolean;
  podeExcluir: boolean;
}

const porHora = (a: RotinaDia, b: RotinaDia) =>
  (a.horario ?? "99").localeCompare(b.horario ?? "99") || a.titulo.localeCompare(b.titulo, "pt-BR");

export function DayView(props: Props) {
  const { dia, hoje, meuId, rotinas, registros, extras, pessoas, podeRegistrar, podeGerenciar, podeExcluir } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [justificando, setJustificando] = useState<{ id: string; motivo: string; texto: string } | null>(null);
  const [confirmarExtra, setConfirmarExtra] = useState<string | null>(null);
  const futuro = dia > hoje;
  const registravel = podeRegistrar && !futuro;

  // Atualiza sozinho a cada minuto, para ver o que os colegas registraram.
  const ocupado = useRef(false);
  useEffect(() => {
    ocupado.current = !!justificando || isPending;
  }, [justificando, isPending]);
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden && !ocupado.current) router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  const regMap = useMemo(() => new Map(registros.map((r) => [r.rotinaId, r])), [registros]);
  const pessoasComItens = useMemo(() => {
    const ids = new Set([...rotinas.map((r) => r.responsavelId), ...extras.map((x) => x.responsavelId)]);
    const nomes = new Map<string, string>();
    rotinas.forEach((r) => nomes.set(r.responsavelId, r.responsavel));
    extras.forEach((x) => nomes.set(x.responsavelId, x.responsavel));
    return [...ids].map((id) => ({ id, nome: nomes.get(id) ?? "—" })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rotinas, extras]);

  const visiveis = filtro === "todos" ? rotinas : rotinas.filter((r) => r.responsavelId === filtro);
  const extrasVisiveis = filtro === "todos" ? extras : extras.filter((x) => x.responsavelId === filtro);
  const feitas = visiveis.filter((r) => regMap.get(r.id)?.status === "FEITO").length;
  const naoFeitas = visiveis.filter((r) => regMap.get(r.id)?.status === "NAO_FEITO").length;
  const pendentes = visiveis.length - feitas - naoFeitas;
  const total = visiveis.length || 1;

  const grupos = useMemo(() => {
    const g = new Map<string, { nome: string; itens: RotinaDia[] }>();
    for (const r of visiveis) {
      if (!g.has(r.responsavelId)) g.set(r.responsavelId, { nome: r.responsavel, itens: [] });
      g.get(r.responsavelId)!.itens.push(r);
    }
    return [...g.entries()]
      .map(([id, v]) => ({ id, nome: v.nome, itens: v.itens.sort(porHora) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [visiveis]);

  function rodar(chave: string, fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, depois?: () => void) {
    setErro(null);
    setBusy(chave);
    startTransition(async () => {
      try {
        const r = await fn();
        if (!r.ok) {
          setErro(r.error ?? "Não foi possível salvar.");
          return;
        }
        depois?.();
        setAviso(ok);
        router.refresh();
      } catch {
        setErro("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      } finally {
        setBusy(null);
      }
    });
  }

  function marcar(r: RotinaDia, status: StatusRegistro, motivo?: string, justificativa?: string) {
    rodar(
      r.id,
      () => marcarRotina({ rotinaId: r.id, data: dia, status, motivo, justificativa }),
      status === "FEITO" ? "Marcado como feito" : "Justificativa registrada",
      () => setJustificando(null),
    );
  }

  const stat = (n: number, label: string, cor = "text-slate-900") => (
    <div className="flex flex-col gap-0.5 bg-white px-4 py-3">
      <span className={`text-2xl font-bold tabular-nums ${cor}`}>{n}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{formatarDiaLongo(dia)}</h1>
          <p className="text-sm text-slate-500">
            {dia === hoje ? "Hoje" : futuro ? "Dia futuro: só para consulta" : "Dia anterior"}
            {!podeRegistrar && " · seu acesso é só de visualização"}
          </p>
        </div>
        <DateNav dia={dia} hoje={hoje} />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-brand-100 bg-brand-100 sm:grid-cols-5">
        {stat(visiveis.length, "Programadas")}
        {stat(feitas, "Feitas", "text-brand-700")}
        {stat(naoFeitas, "Não feitas (justificadas)", "text-amber-700")}
        {stat(pendentes, "Pendentes", "text-slate-500")}
        {stat(extrasVisiveis.length, "Extras")}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="bg-brand-500" style={{ width: `${(feitas / total) * 100}%` }} />
        <div className="bg-amber-500" style={{ width: `${(naoFeitas / total) * 100}%` }} />
      </div>

      {pessoasComItens.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por pessoa">
          {[{ id: "todos", nome: "Todos" }, ...pessoasComItens].map((p) => {
            const rs = p.id === "todos" ? rotinas : rotinas.filter((r) => r.responsavelId === p.id);
            const ok = rs.filter((r) => regMap.has(r.id)).length;
            const on = filtro === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltro(p.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
                  on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.id === meuId ? `${p.nome} (você)` : p.nome}
                {p.id !== "todos" && rs.length > 0 && (
                  <span className={`text-xs tabular-nums ${on ? "text-white/75" : "text-slate-400"}`}>
                    {ok}/{rs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {rotinas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Nenhuma rotina programada para este dia.
          {podeGerenciar && " Cadastre as rotinas da equipe em Configurar rotinas."}
        </div>
      ) : (
        grupos.map((g) => {
          const reg = g.itens.filter((r) => regMap.has(r.id)).length;
          return (
            <section key={g.id} className="overflow-hidden rounded-xl border border-brand-100 bg-white">
              <div className="flex items-center justify-between border-b border-brand-100 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-slate-900">{g.nome}</h2>
                <span className="text-xs tabular-nums text-slate-500">
                  {reg}/{g.itens.length} registradas
                </span>
              </div>
              <ul>
                {g.itens.map((r) => {
                  const g2 = regMap.get(r.id);
                  const st = g2?.status ?? "PENDENTE";
                  const borda =
                    st === "FEITO" ? "border-l-brand-500" : st === "NAO_FEITO" ? "border-l-amber-500" : "border-l-slate-200";
                  const justif = justificando?.id === r.id ? justificando : null;
                  return (
                    <li
                      key={r.id}
                      className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-l-4 border-t border-t-slate-100 px-4 py-3 first:border-t-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] ${borda}`}
                    >
                      <span className="pt-0.5 text-xs tabular-nums text-slate-500">{r.horario ?? "—"}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{r.titulo}</p>
                        {r.local && <p className="text-xs text-slate-500">{r.local}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {st === "FEITO" && <span className="rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-800">Feito</span>}
                          {st === "NAO_FEITO" && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Não feito</span>}
                          {st === "PENDENTE" && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">Pendente</span>}
                          {g2 && (
                            <span className="text-slate-500">
                              {horaBahia(g2.em)}
                              {g2.por ? ` · por ${g2.por}` : ""}
                            </span>
                          )}
                        </div>
                        {g2?.status === "NAO_FEITO" && (
                          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-slate-800">
                            <strong>{g2.motivo}</strong>
                            {g2.justificativa ? `: ${g2.justificativa}` : ""}
                          </p>
                        )}
                      </div>
                      {registravel && !justif && (
                        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end">
                          {st === "PENDENTE" ? (
                            <>
                              <button
                                type="button"
                                disabled={busy === r.id}
                                onClick={() => marcar(r, "FEITO")}
                                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                              >
                                Feito
                              </button>
                              <button
                                type="button"
                                disabled={busy === r.id}
                                onClick={() => setJustificando({ id: r.id, motivo: "", texto: "" })}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                Não feito
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busy === r.id}
                              onClick={() => rodar(r.id, () => desfazerRegistro({ rotinaId: r.id, data: dia }), "Registro desfeito")}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                            >
                              Desfazer
                            </button>
                          )}
                        </div>
                      )}
                      {justif && (
                        <div className="col-span-2 flex flex-col gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 sm:col-span-3 sm:ml-[3.75rem]">
                          <label htmlFor={`mot-${r.id}`} className="text-xs font-medium text-slate-700">
                            Motivo da não execução
                          </label>
                          <select
                            id={`mot-${r.id}`}
                            autoFocus
                            value={justif.motivo}
                            onChange={(e) => setJustificando({ ...justif, motivo: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Escolha o motivo</option>
                            {MOTIVOS_NAO_EXECUCAO.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <textarea
                            aria-label="Justificativa"
                            maxLength={500}
                            rows={2}
                            value={justif.texto}
                            onChange={(e) => setJustificando({ ...justif, texto: e.target.value })}
                            placeholder="Explique o que aconteceu e, se houver, quando será feito"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setJustificando(null)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={busy === r.id}
                              onClick={() => {
                                if (!justif.motivo) return setErro("Escolha o motivo.");
                                if (justif.motivo === "Outro" && !justif.texto.trim()) return setErro("Descreva o motivo.");
                                marcar(r, "NAO_FEITO", justif.motivo, justif.texto.trim());
                              }}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                            >
                              Salvar justificativa
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <section className="mt-2 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Atividades extras</h2>
          {extrasVisiveis.length > 0 && <span className="text-xs tabular-nums text-slate-500">{extrasVisiveis.length} no dia</span>}
        </div>
        <p className="text-sm text-slate-500">
          Algo que não estava programado e foi feito neste dia? Registre aqui para ficar no histórico.
        </p>
        {registravel && (
          <ExtraForm
            key={`${filtro}-${dia}`}
            pessoas={pessoas}
            meuId={meuId}
            filtro={filtro}
            salvando={busy === "extra"}
            onSalvar={(dados, limpar) =>
              rodar("extra", () => adicionarExtra({ data: dia, ...dados }), "Atividade extra incluída", limpar)
            }
          />
        )}
        {extrasVisiveis.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma atividade extra registrada neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {extrasVisiveis.map((x) => (
              <li
                key={x.id}
                className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 rounded-lg border border-l-4 border-slate-200 border-l-brand-500 bg-white px-4 py-3"
              >
                <span className="pt-0.5 text-xs tabular-nums text-slate-500">{horaBahia(x.em)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{x.descricao}</p>
                  <p className="text-xs text-slate-500">
                    {x.responsavel}
                    {x.observacao ? ` · ${x.observacao}` : ""}
                  </p>
                  {x.por && <p className="text-xs text-slate-400">Registrado por {x.por}</p>}
                </div>
                {podeExcluir && (
                  <div className="flex gap-2">
                    {confirmarExtra === x.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmarExtra(null);
                            rodar(`x-${x.id}`, () => excluirExtra(x.id), "Atividade extra excluída");
                          }}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Confirmar
                        </button>
                        <button type="button" onClick={() => setConfirmarExtra(null)} className="px-2 py-1 text-xs text-slate-500">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === `x-${x.id}`}
                        onClick={() => setConfirmarExtra(x.id)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {aviso && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg"
        >
          {aviso}
        </div>
      )}
    </div>
  );
}

function ExtraForm({
  pessoas,
  meuId,
  filtro,
  salvando,
  onSalvar,
}: {
  pessoas: { id: string; nome: string }[];
  meuId: string;
  filtro: string;
  salvando: boolean;
  onSalvar: (dados: { descricao: string; observacao: string; responsavelId: string }, limpar: () => void) => void;
}) {
  const padrao = filtro !== "todos" && pessoas.some((p) => p.id === filtro) ? filtro : pessoas.some((p) => p.id === meuId) ? meuId : (pessoas[0]?.id ?? meuId);
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [responsavelId, setResponsavelId] = useState(padrao);
  const [erro, setErro] = useState<string | null>(null);
  const equipe = pessoas.length > 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!descricao.trim()) return setErro("Descreva a atividade extra.");
        setErro(null);
        onSalvar({ descricao: descricao.trim(), observacao: observacao.trim(), responsavelId }, () => {
          setDescricao("");
          setObservacao("");
        });
      }}
      className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-white p-4 md:flex-row md:items-end"
    >
      <div className="flex min-w-0 flex-[2] flex-col gap-1">
        <label htmlFor="ex-desc" className="text-xs font-medium text-slate-600">O que foi feito</label>
        <input
          id="ex-desc"
          maxLength={200}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Coleta emergencial no cliente X"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {equipe && (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="ex-resp" className="text-xs font-medium text-slate-600">Responsável</label>
          <select
            id="ex-resp"
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex min-w-0 flex-[1.5] flex-col gap-1">
        <label htmlFor="ex-obs" className="text-xs font-medium text-slate-600">Observação (opcional)</label>
        <input
          id="ex-obs"
          maxLength={300}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Motivo, solicitante, placa…"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={salvando}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {salvando ? "Salvando…" : "Incluir extra"}
      </button>
      {erro && <p className="text-sm text-red-600 md:basis-full">{erro}</p>}
    </form>
  );
}
