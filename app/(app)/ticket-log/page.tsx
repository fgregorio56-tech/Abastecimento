import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ACTIVITY_TYPE_LABELS, type ActivityType } from "@/lib/roles";
import Link from "next/link";

const PAGE_SIZE = 40;

const TYPE_BADGE: Record<ActivityType, string> = {
  IMPORTACAO: "bg-sky-100 text-sky-700",
  CORRECAO: "bg-amber-100 text-amber-700",
  EXCLUSAO: "bg-red-100 text-red-700",
  VEICULO: "bg-teal-100 text-teal-700",
  META: "bg-violet-100 text-violet-700",
  USUARIO: "bg-slate-200 text-slate-700",
  SISTEMA: "bg-rose-200 text-rose-800",
};

export default async function TicketLogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina ?? "1") || 1);

  const [total, logs] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ticket Log</h1>
        <p className="text-sm text-slate-500">
          Histórico de todas as importações, correções, exclusões e alterações feitas no sistema.
        </p>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-brand-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-slate-50 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Quando</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Tipo</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Descrição</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Usuário</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  Nenhuma atividade registrada ainda.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                  {log.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[log.tipo as ActivityType] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {ACTIVITY_TYPE_LABELS[log.tipo as ActivityType] ?? log.tipo}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{log.descricao}</td>
                <td className="px-3 py-2 text-slate-500">{log.user?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link
            href={`/ticket-log?pagina=${Math.max(1, page - 1)}`}
            className={`rounded-md border border-slate-300 px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
          >
            Anterior
          </Link>
          <span className="text-slate-500">
            Página {page} de {totalPages}
          </span>
          <Link
            href={`/ticket-log?pagina=${Math.min(totalPages, page + 1)}`}
            className={`rounded-md border border-slate-300 px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
          >
            Próxima
          </Link>
        </div>
      )}
    </div>
  );
}
