import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canEditData } from "@/lib/roles";
import { parsePeriod } from "@/lib/period";
import { EditableRow, type RowData } from "./EditableRow";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export default async function AbastecimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const somenteErro = params.erro === "1";
  const page = Math.max(1, Number(params.pagina ?? "1") || 1);
  const meses = parsePeriod(params);

  const lote = typeof params.lote === "string" ? params.lote : undefined;

  const where: Prisma.FuelRecordWhereInput = {
    ...(somenteErro ? { hasError: true } : {}),
    ...(lote ? { importBatchId: lote } : {}),
  };
  if (meses) {
    where.OR = [...meses].map((mes) => {
      const [ano, mm] = mes.split("-").map(Number);
      const start = new Date(Date.UTC(ano, mm - 1, 1));
      const end = new Date(Date.UTC(ano, mm, 1));
      return { data: { gte: start, lt: end } };
    });
  }

  const [total, records, errorCount] = await Promise.all([
    prisma.fuelRecord.count({ where }),
    prisma.fuelRecord.findMany({
      where,
      orderBy: [{ hasError: "desc" }, { data: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.fuelRecord.count({ where: { hasError: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = canEditData(user.role);

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (somenteErro) sp.set("erro", "1");
    if (lote) sp.set("lote", lote);
    if (meses) for (const m of meses) sp.append("mes", m);
    sp.set("pagina", String(p));
    return `/abastecimentos?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Abastecimentos</h1>
          <p className="text-sm text-slate-500">
            {total} registro(s) encontrados
            {lote && " — resultado da última importação"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={somenteErro ? "/abastecimentos" : "/abastecimentos?erro=1"}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              somenteErro
                ? "bg-red-600 text-white"
                : "border border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            {somenteErro ? `Mostrando apenas erros (${errorCount})` : `Ver apenas com erro (${errorCount})`}
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Placa</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">KM</th>
              <th className="px-3 py-2 text-right">Litros</th>
              <th className="px-3 py-2">Combustível</th>
              <th className="px-3 py-2">Posto</th>
              <th className="px-3 py-2">Situação</th>
              {canEdit && <th className="px-3 py-2">Ações</th>}
            </tr>
          </thead>
          <tbody className="px-3">
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Nenhum abastecimento encontrado.
                </td>
              </tr>
            )}
            {records.map((r) => {
              const row: RowData = {
                id: r.id,
                placaTexto: r.placaTexto,
                data: r.data ? r.data.toISOString() : null,
                km: r.km,
                litros: r.litros,
                combustivel: r.combustivel,
                posto: r.posto,
                hasError: r.hasError,
                errors: JSON.parse(r.errors) as string[],
                corrected: r.corrected,
              };
              return <EditableRow key={r.id} row={row} canEdit={canEdit} />;
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`rounded-md border border-slate-300 px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
          >
            Anterior
          </Link>
          <span className="text-slate-500">
            Página {page} de {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`rounded-md border border-slate-300 px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
          >
            Próxima
          </Link>
        </div>
      )}
    </div>
  );
}
