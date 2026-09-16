"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeUserRole, resetUserPassword, toggleUserActive } from "./actions";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

export interface UserRowData {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  isSelf: boolean;
}

export function UserRow({ user }: { user: UserRowData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleActive() {
    startTransition(async () => {
      const result = await toggleUserActive(user.id, !user.active);
      if (!result.ok) setError(result.error ?? "Erro.");
      router.refresh();
    });
  }

  function changeRole(role: Role) {
    startTransition(async () => {
      const result = await changeUserRole(user.id, role);
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
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2 font-medium text-slate-900">
        {user.name} {user.isSelf && <span className="text-xs text-slate-400">(você)</span>}
      </td>
      <td className="px-3 py-2 text-slate-600">{user.email}</td>
      <td className="px-3 py-2">
        <select
          value={user.role}
          disabled={user.isSelf || isPending}
          onChange={(e) => changeRole(e.target.value as Role)}
          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
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
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha"
                className="w-32 rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <button onClick={savePassword} disabled={isPending} className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
                Salvar
              </button>
              <button onClick={() => setResetting(false)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setResetting(true)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
