"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "./actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const initialState: CreateUserState = { ok: true };

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Nome</label>
        <input name="name" required className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">E-mail</label>
        <input name="email" type="email" required className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Senha provisória</label>
        <input name="password" type="text" required minLength={8} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Perfil</label>
        <select name="role" defaultValue="VIEWER" className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {ROLES.filter((r) => r !== "MASTER").map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar usuário"}
      </button>

      {state.error && (
        <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && !pending && state !== initialState && (
        <p className="w-full text-sm text-emerald-700">Usuário criado com sucesso.</p>
      )}
    </form>
  );
}
