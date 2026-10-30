import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { parseModulos } from "@/lib/permissions";
import { CreateUserForm } from "./CreateUserForm";
import { UserRow, type SupervisorOption } from "./UserRow";
import { DangerZone } from "./DangerZone";

export default async function UsuariosPage() {
  const me = await requireRole("MASTER");

  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role === "MASTER" ? "MASTER" : "USUARIO") as "MASTER" | "USUARIO",
    modulos: parseModulos(u.modulos),
    supervisorId: u.supervisorId,
    active: u.active,
    isSelf: u.id === me.id,
  }));
  const supervisores: SupervisorOption[] = rows
    .filter((u) => u.active && (u.role === "MASTER" || u.modulos.ROTINA === "SUPERVISOR"))
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários e acessos</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          O <strong>Administrador</strong> acessa tudo. Para os demais, marque em cada módulo o que a pessoa pode
          fazer: <strong>Visualizar</strong> (só consulta), <strong>Incluir e editar</strong> ou{" "}
          <strong>Supervisor</strong> (no Abastecimento, também exclui). No Check de rotina, o nível mais alto é{" "}
          <strong>Gestor da equipe</strong>: a pessoa não vira Administrador, mas responde pela equipe dela (quem tiver
          ela na coluna Gestor): vê o resumo da equipe, marca e justifica, configura, transfere e exclui rotinas da
          equipe. Para alguém aparecer como opção na coluna Gestor, dê a ela o nível Gestor da equipe no Check de rotina.
          Quem não tem um módulo liberado não vê nada dele.
        </p>
      </div>

      <div className="rounded-xl border border-brand-100 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Novo usuário</h2>
        <CreateUserForm supervisores={supervisores} />
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-brand-100 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-slate-50 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Nome</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Login</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Perfil</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Abastecimento</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Check de rotina</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Gestor (rotina)</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Situação</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <UserRow key={u.id} user={u} supervisores={supervisores.filter((s) => s.id !== u.id)} />
            ))}
          </tbody>
        </table>
      </div>

      <DangerZone />
    </div>
  );
}
