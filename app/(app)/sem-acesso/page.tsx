import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { visibleModules } from "@/lib/permissions";

export default async function SemAcessoPage() {
  const user = await requireUser();
  if (visibleModules(user).length > 0) redirect("/");

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl border border-brand-100 bg-white p-6">
      <h1 className="text-lg font-bold text-slate-900">Nenhum módulo liberado</h1>
      <p className="mt-2 text-sm text-slate-600">
        Seu usuário está ativo, mas ainda não tem acesso a nenhum módulo. Peça ao administrador para liberar o
        acesso em Usuários e acessos.
      </p>
    </div>
  );
}
