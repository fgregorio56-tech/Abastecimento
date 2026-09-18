import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canEditData } from "@/lib/roles";
import { parsePeriod } from "@/lib/period";
import type { RowData } from "./EditableRow";
import { FuelRecordsTable, type SortLinks } from "./FuelRecordsTable";
import { SearchBox } from "../SearchBox";
import { UnitFilter } from "../UnitFilter";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;
const SORTABLE_FIELDS = ["placaTexto", "data", "km", "litros"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

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
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const lote = typeof params.lote === "string" ? params.lote : undefined;
  const unidade = typeof params.unidade === "string" ? params.unidade : "";

  const sortParam = typeof params.sort === "string" ? params.sort : undefined;
  const currentSort: SortableField | undefined = SORTABLE_FIELDS.includes(sortParam as SortableField)
    ? (sortParam as SortableField)
    : undefined;
  const currentDir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";

  const andConditions: Prisma.FuelRecordWhereInput[] = [];
  if (somenteErro) andConditions.push({ hasError: true });
  if (lote) andConditions.push({ importBatchId: lote });
  if (meses) {
    andConditions.push({
      OR: [...meses].map((mes) => {
        const [ano, mm] = mes.split("-").map(Number);
        const start = new Date(Date.UTC(ano, mm - 1, 1));
        const end = new Date(Date.UTC(ano, mm, 1));
        return { data: { gte: start, lt: end } };
      }),
    });
  }
  if (q) {
    andConditions.push({
      OR: [
        { placaTexto: { contains: q, mode: "insensitive" } },
        { motorista: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (unidade) andConditions.push({ vehicle: { unidade } });
  const where: Prisma.FuelRecordWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy: Prisma.FuelRecordOrderByWithRelationInput[] = currentSort
    ? [{ [currentSort]: currentDir }]
    : [{ hasError: "desc" }, { data: "desc" }];

  const [total, records, errorCount] = await Promise.all([
    prisma.fuelRecord.count({ where }),
    prisma.fuelRecord.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.fuelRecord.count({ where: { hasError: true, ...(unidade ? { vehicle: { unidade } } : {}) } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = canEditData(user.role);

  function baseParams() {
    const sp = new URLSearchParams();
    if (somenteErro) sp.set("erro", "1");
    if (lote) sp.set("lote", lote);
    if (meses) for (const m of meses) sp.append("mes", m);
    if (q) sp.set("q", q);
    if (unidade) sp.set("unidade", unidade);
    return sp;
  }

  function pageHref(p: number) {
    const sp = baseParams();
    if (currentSort) {
      sp.set("sort", currentSort);
      sp.set("dir", currentDir);
    }
    sp.set("pagina", String(p));
    return `/abastecimentos?${sp.toString()}`;
  }

  function sortHref(column: SortableField) {
    const sp = baseParams();
    const nextDir: "asc" | "desc" = currentSort === column && currentDir === "asc" ? "desc" : "asc";
    sp.set("sort", column);
    sp.set("dir", nextDir);
    return `/abastecimentos?${sp.toString()}`;
  }

  const sortLinks: SortLinks = {
    placaTexto: sortHref("placaTexto"),
    data: sortHref("data"),
    km: sortHref("km"),
    litros: sortHref("litros"),
  };

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

      <div className="flex flex-wrap gap-2">
        <SearchBox initialValue={q} placeholder="Buscar por placa ou motorista..." />
        <UnitFilter initialValue={unidade} />
      </div>

      <FuelRecordsTable
        rows={records.map(
          (r): RowData => ({
            id: r.id,
            placaTexto: r.placaTexto,
            data: r.data ? r.data.toISOString() : null,
            km: r.km,
            litros: r.litros,
            combustivel: r.combustivel,
            origem: r.origem,
            motorista: r.motorista,
            posto: r.posto,
            hasError: r.hasError,
            errors: JSON.parse(r.errors) as string[],
            corrected: r.corrected,
          }),
        )}
        canEdit={canEdit}
        sortLinks={sortLinks}
        currentSort={currentSort}
        currentDir={currentDir}
      />

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
