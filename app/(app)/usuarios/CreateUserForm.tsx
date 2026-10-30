"use client";

import { useActionState, useState } from "react";
import { createUser, type CreateUserState } from "./actions";
import { ROLE_LABELS } from "@/lib/roles";
import { LEVELS, levelLabel, MODULES, MODULE_LABELS } from "@/lib/permissions";
import type { SupervisorOption } from "./UserRow";

const initialState: CreateUserState = { ok: true };
const inputCls = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function CreateUserForm({ supervisores }: { supervisores: SupervisorOption[] }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [role, setRole] = useState<"USUARIO" | "MASTER">("USUARIO");
  const [rotina, setRotina] = useState("EDITOR");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="nu-name" className="text-xs font-medium text-slate-600">Nome</label>
          <input id="nu-name" name="name" required className={`w-48 ${inputCls}`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nu-email" className="text-xs font-medium text-slate-600">E-mail ou usuário</label>
          <input
            id="nu-email"
            name="email"
            required
            autoCapitalize="none"
            placeholder="joao.silva"
            className={`w-56 ${inputCls}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nu-pass" className="text-xs font-medium text-slate-600">Senha provisória</label>
          <input id="nu-pass" name="password" type="text" required minLength={8} className={`w-40 ${inputCls}`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nu-role" className="text-xs font-medium text-slate-600">Perfil</label>
          <select
            id="nu-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "USUARIO" | "MASTER")}
            className={`w-44 ${inputCls}`}
          >
            <option value="USUARIO">{ROLE_LABELS.USUARIO}</option>
            <option value="MASTER">{ROLE_LABELS.MASTER}</option>
          </select>
        </div>
      </div>

      {role === "USUARIO" && (
        <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          {MODULES.map((m) => (
            <div key={m} className="flex flex-col gap-1">
              <label htmlFor={`nu-mod-${m}`} className="text-xs font-medium text-slate-600">
                {MODULE_LABELS[m]}
              </label>
              <select
                id={`nu-mod-${m}`}
                name={`mod_${m}`}
                defaultValue={m === "ROTINA" ? "EDITOR" : ""}
                onChange={m === "ROTINA" ? (e) => setRotina(e.target.value) : undefined}
                className={`w-56 ${inputCls}`}
              >
                <option value="">Sem acesso</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {levelLabel(m, l)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {rotina && (
            <div className="flex flex-col gap-1">
              <label htmlFor="nu-sup" className="text-xs font-medium text-slate-600">Supervisor (rotina)</label>
              <select id="nu-sup" name="supervisorId" defaultValue="" className={`w-48 ${inputCls}`}>
                <option value="">Nenhum</option>
                {supervisores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar usuário"}
        </button>
        {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        {state.ok && !pending && state !== initialState && (
          <p className="text-sm text-emerald-700">Usuário criado com sucesso.</p>
        )}
      </div>
    </form>
  );
}
