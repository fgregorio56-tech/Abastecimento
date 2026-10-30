"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { DIAS_SEMANA, descreverFrequencia } from "@/lib/rotinas-shared";
import { alternarRotina, excluirRotina, salvarRotina, transferirRotina } from "../actions";

export interface RotinaConfig {
  id: string;
  titulo: string;
  local: string | null;
  horario: string | null;
  frequencia: string;
  diasSemana: number[];
  diaMes: number | null;
  ativo: boolean;
  responsavelId: string;
  responsavel: string;
}

interface Form {
  id?: string;
  titulo: string;
  local: string;
  horario: string;
  frequencia: "SEMANAL" | "MENSAL";
  diasSemana: number[];
  diaMes: string;
  responsavelId: string;
}

const VAZIO: Form = {
  titulo: "",
  local: "",
  horario: "",
  frequencia: "SEMANAL",
  diasSemana: [1, 2, 3, 4, 5],
  diaMes: "1",
  responsavelId: "",
};

const ATALHOS: [string, number[]][] = [
  ["Seg a Sex", [1, 2, 3, 4, 5]],
  ["Seg a Sáb", [1, 2, 3, 4, 5, 6]],
  ["Todos", [0, 1, 2, 3, 4, 5, 6]],
];

const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm";
const label = "text-xs font-medium text-slate-600";

export function RotinasConfig({
  rotinas,
  pessoas,
  podeExcluir,
}: {
  rotinas: RotinaConfig[];
  pessoas: { id: string; nome: string }[];
  /** Gestor da equipe e Administrador excluem. */
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Form>({ ...VAZIO, responsavelId: pessoas.length === 1 ? pessoas[0].id : "" });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [transferir, setTransferir] = useState<{ id: string; para: string } | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, depois?: () => void) {
    setErro(null);
    setOk(null);
    startTransition(async () => {
      try {
        const r = await fn();
        if (!r.ok) return setErro(r.error ?? "Não foi possível salvar.");
        depois?.();
        setOk(msg);
        router.refresh();
      } catch {
        setErro("Sem conexão com o servidor. Tente de novo.");
      }
    });
  }

  function editar(r: RotinaConfig) {
    setForm({
      id: r.id,
      titulo: r.titulo,
      local: r.local ?? "",
      horario: r.horario ?? "",
      frequencia: r.frequencia === "MENSAL" ? "MENSAL" : "SEMANAL",
      diasSemana: r.diasSemana,
      diaMes: String(r.diaMes ?? 1),
      responsavelId: r.responsavelId,
    });
    setErro(null);
    setOk(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpar() {
    setForm({ ...VAZIO, responsavelId: pessoas.length === 1 ? pessoas[0].id : "" });
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return setErro("Informe a atividade.");
    if (!form.responsavelId) return setErro("Escolha o responsável.");
    if (form.frequencia === "SEMANAL" && form.diasSemana.length === 0) return setErro("Marque pelo menos um dia da semana.");
    const editando = !!form.id;
    run(
      () =>
        salvarRotina({
          id: form.id,
          titulo: form.titulo,
          local: form.local,
          horario: form.horario,
          frequencia: form.frequencia,
          diasSemana: form.diasSemana,
          diaMes: Number(form.diaMes),
          responsavelId: form.responsavelId,
        }),
      editando ? "Rotina atualizada." : "Rotina adicionada.",
      limpar,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={salvar} className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">{form.id ? "Editar rotina" : "Nova rotina"}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="rf-titulo" className={label}>Atividade</label>
            <input
              id="rf-titulo"
              maxLength={140}
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Ex.: Checklist pré-operacional dos veículos"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rf-resp" className={label}>Responsável</label>
            <select id="rf-resp" value={form.responsavelId} onChange={(e) => set("responsavelId", e.target.value)} className={input}>
              <option value="">Selecione</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rf-hora" className={label}>Horário (opcional)</label>
            <input id="rf-hora" type="time" value={form.horario} onChange={(e) => set("horario", e.target.value)} className={input} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="rf-local" className={label}>Local ou detalhe (opcional)</label>
            <input
              id="rf-local"
              maxLength={140}
              value={form.local}
              onChange={(e) => set("local", e.target.value)}
              placeholder="Ex.: Pátio Simões Filho, rota 03"
              className={input}
            />
          </div>
          <fieldset className="flex flex-col gap-1 sm:col-span-2">
            <legend className={label}>Frequência</legend>
            <div className="flex min-h-[38px] flex-wrap items-center gap-4 text-sm">
              {(["SEMANAL", "MENSAL"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <input type="radio" name="rf-freq" checked={form.frequencia === f} onChange={() => set("frequencia", f)} />
                  {f === "SEMANAL" ? "Dias da semana" : "Uma vez por mês"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {form.frequencia === "SEMANAL" ? (
          <div className="flex flex-wrap items-center gap-2">
            {DIAS_SEMANA.map((d, i) => {
              const on = form.diasSemana.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set("diasSemana", on ? form.diasSemana.filter((x) => x !== i) : [...form.diasSemana, i].sort((a, b) => a - b))
                  }
                  className={`w-12 rounded-lg border py-1.5 text-sm font-medium ${
                    on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              );
            })}
            <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
            {ATALHOS.map(([nome, dias]) => (
              <button
                key={nome}
                type="button"
                onClick={() => set("diasSemana", dias)}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                {nome}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex w-40 flex-col gap-1">
            <label htmlFor="rf-diames" className={label}>Dia do mês</label>
            <input
              id="rf-diames"
              type="number"
              min={1}
              max={31}
              value={form.diaMes}
              onChange={(e) => set("diaMes", e.target.value)}
              className={input}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {erro && <p className="mr-auto rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">{erro}</p>}
          {ok && <p className="mr-auto text-sm text-brand-700">{ok}</p>}
          {form.id && (
            <button type="button" onClick={limpar} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar edição
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {form.id ? "Salvar alterações" : "Adicionar rotina"}
          </button>
        </div>
      </form>

      {rotinas.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma rotina cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Atividade</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Frequência</th>
                <th className="px-3 py-2">Horário</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rotinas.map((r) => (
                <tr key={r.id} className={`border-b border-slate-100 align-top ${r.ativo ? "" : "text-slate-400"}`}>
                  <td className="px-3 py-2">
                    <span className={r.ativo ? "font-medium text-slate-900" : ""}>{r.titulo}</span>
                    {!r.ativo && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Pausada</span>
                    )}
                    {r.local && <p className="text-xs text-slate-500">{r.local}</p>}
                  </td>
                  <td className="px-3 py-2">
                    {transferir?.id === r.id ? (
                      <div className="flex flex-col gap-1">
                        <select
                          aria-label={`Novo responsável por ${r.titulo}`}
                          value={transferir.para}
                          onChange={(e) => setTransferir({ id: r.id, para: e.target.value })}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="">Transferir para...</option>
                          {pessoas
                            .filter((p) => p.id !== r.responsavelId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                        </select>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={!transferir.para || isPending}
                            onClick={() => {
                              const para = transferir.para;
                              setTransferir(null);
                              run(() => transferirRotina(r.id, para), "Rotina transferida.");
                            }}
                            className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                          <button type="button" onClick={() => setTransferir(null)} className="px-2 py-1 text-xs text-slate-500">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      r.responsavel
                    )}
                  </td>
                  <td className="px-3 py-2">{descreverFrequencia(r)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.horario ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {confirmar === r.id ? (
                        <>
                          <span className="self-center text-xs text-red-700">Apaga também o histórico.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmar(null);
                              run(() => excluirRotina(r.id), "Rotina excluída.");
                            }}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Confirmar exclusão
                          </button>
                          <button type="button" onClick={() => setConfirmar(null)} className="px-2 py-1 text-xs text-slate-500">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => editar(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => run(() => alternarRotina(r.id, !r.ativo), r.ativo ? "Rotina pausada." : "Rotina reativada.")}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            {r.ativo ? "Pausar" : "Reativar"}
                          </button>
                          {pessoas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmar(null);
                                setTransferir({ id: r.id, para: "" });
                              }}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Transferir
                            </button>
                          )}
                          {podeExcluir && (
                            <button
                              type="button"
                              onClick={() => setConfirmar(r.id)}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Excluir
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
