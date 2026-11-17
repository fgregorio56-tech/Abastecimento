import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { isAdmin, parseModulos } from "@/lib/permissions";
import MetasProjetos, { type Estado } from "./MetasProjetos";
import { salvarPlanejamento } from "./actions";

/**
 * Meu planejamento: cada pessoa vê e edita só o próprio. O Administrador
 * escolhe de quem ver (inclusive o dele) e pode editar.
 */
export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  const user = await requireModule("PLANEJAMENTO");
  const admin = isAdmin(user);
  const { usuario } = await searchParams;

  const pessoas = admin
    ? (
        await prisma.user.findMany({
          select: { id: true, name: true, role: true, modulos: true, planejamento: { select: { userId: true } } },
          orderBy: { name: "asc" },
        })
      ).filter((u) => u.role === "MASTER" || parseModulos(u.modulos).PLANEJAMENTO || u.planejamento)
    : [];

  const donoId = admin && usuario && pessoas.some((p) => p.id === usuario) ? usuario : user.id;
  const registro = await prisma.planejamento.findUnique({ where: { userId: donoId }, select: { dados: true } });

  return (
    <div className="flex flex-col gap-4">
      {admin && (
        <form className="flex flex-wrap items-end gap-2 rounded-xl border border-brand-100 bg-white p-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="pl-usuario" className="text-xs font-medium text-slate-600">
              Ver o planejamento de
            </label>
            <select
              id="pl-usuario"
              name="usuario"
              defaultValue={donoId}
              className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === user.id ? `${p.name} (eu)` : p.name}
                  {p.planejamento ? "" : " — sem dados"}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Ver
          </button>
        </form>
      )}

      {/* key: trocar de pessoa remonta o componente com os dados dela */}
      <MetasProjetos
        key={donoId}
        inicial={(registro?.dados ?? null) as Partial<Estado> | null}
        salvar={salvarPlanejamento.bind(null, donoId)}
      />
    </div>
  );
}
