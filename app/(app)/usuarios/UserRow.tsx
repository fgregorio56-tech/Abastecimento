"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetUserPassword, toggleUserActive, updateUserAccess } from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { LEVELS, LEVEL_LABELS, MODULES, type ModuleAccess, type ModuleKey } from "@/lib/permissions";

export interface SupervisorOption {
  id: string;
  name: string;
}

export interface UserRowData {
  id: string;
  name: string;
  email: string;
  role: Role;
  modulos: ModuleAccess;
  supervisorId: string | null;
  active: boolean;
  isSelf: boolean;
}

const selectCls = "rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50";

export function UserRow({ user, supervisores }: { user: UserRowData; supervisores: SupervisorOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isMaster = user.role === "MASTER";

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await toggleUserActive(user.id, !user.active);
      if (!result.ok) setError(result.error ?? "Erro.");
      router.refresh();
    });
  }

  function saveAccess(patch: { role?: Role; mod?: [ModuleKey, string]; supervisorId?: string | null }) {
    setError(null);
    const modulos: Partial<Record<ModuleKey, string | null>> = { ...user.modulos };
    if (patch.mod) modulos[patch.mod[0]] = patch.mod[1] || null;
    startTransition(async () => {
      const result = await updateUserAccess(user.id, {
        role: patch.role ?? user.role,
        modulos,
        supervisorId: patch.supervisorId !== undefined ? patch.supervisorId : user.supervisorId,
      });
      if (!result.ok) setError(result.error ?? "Erro.");
      router.refresh();
    });
  }

  function savePassword() {
    setError(null);
    startTransition(async () => {
      const result = await resetUserPassword(user.id, newPassword);
      if (!result.ok) {
        setError(result.error ?? "Erro.");
        return;
      }
      setResetting(false);
      setNewPassword("");
    });
  }

  return (
    <tr className={`border-b border-slate-100 align-top ${user.active ? "" : "bg-slate-50 text-slate-400"}`}>
      <td className="px-3 py-2 font-medium text-slate-900">
        {user.name} {user.isSelf && <span className="text-xs text-slate-400">(você)</span>}
        {error && <p className="mt-1 max-w-xs text-xs font-normal text-red-600">{error}</p>}
      </td>
      <td className="px-3 py-2 text-slate-600">{user.email}</td>
      <td className="px-3 py-2">
        <select
          aria-label={`Perfil de ${user.name}`}
          value={user.role}
          disabled={user.isSelf || isPending}
          onChange={(e) => saveAccess({ role: e.target.value as Role })}
          className={selectCls}
        >
          <option value="USUARIO">{ROLE_LABELS.USUARIO}</option>
          <option value="MASTER">{ROLE_LABELS.MASTER}</option>
        </select>
      </td>
      {MODULES.map((m) => (
        <td key={m} className="px-3 py-2">
          {isMaster ? (
            <span className="text-xs text-slate-500">Acesso total</span>
          ) : (
            <select
              aria-label={`Acesso de ${user.name} ao módulo ${m}`}
              value={user.modulos[m] ?? ""}
              disabled={isPending}
              onChange={(e) => saveAccess({ mod: [m, e.target.value] })}
              className={`${selectCls} ${user.modulos[m] ? "" : "text-slate-400"}`}
            >
              <option value="">Sem acesso</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          )}
        </td>
      ))}
      <td className="px-3 py-2">
        {!isMaster && user.modulos.ROTINA ? (
          <select
            aria-label={`Supervisor de ${user.name}`}
            value={user.supervisorId ?? ""}
            disabled={isPending}
            onChange={(e) => saveAccess({ supervisorId: e.target.value || null })}
            className={selectCls}
          >
            <option value="">Nenhum</option>
            {supervisores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {user.active ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Ativo</span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Inativo</span>
        )}
      </td>
      <td className="px-3 py-2">
        {resetting ? (
          <div className="flex gap-1">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
              aria-label="Nova senha"
              className="w-32 rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <button onClick={savePassword} disabled={isPending} className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700">
              Salvar
            </button>
            <button onClick={() => setResetting(false)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setResetting(true)} className="whitespace-nowrap rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Redefinir senha
            </button>
            <button
              onClick={toggleActive}
              disabled={user.isSelf || isPending}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {user.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
