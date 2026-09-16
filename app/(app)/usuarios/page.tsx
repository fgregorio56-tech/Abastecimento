import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { CreateUserForm } from "./CreateUserForm";
import { UserRow } from "./UserRow";

export default async function UsuariosPage() {
  const me = await requireRole("MASTER");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="text-sm text-slate-500">
          Como usuário mestre, você pode criar editores (importam e corrigem dados) e
          visualizadores (apenas consultam relatórios).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Novo usuário</h2>
        <CreateUserForm />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Perfil</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={{ id: u.id, name: u.name, email: u.email, role: u.role as "MASTER" | "EDITOR" | "VIEWER", active: u.active, isSelf: u.id === me.id }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
