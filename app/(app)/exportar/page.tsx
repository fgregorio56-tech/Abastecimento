import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getValidRecordsForMetrics } from "@/lib/data";
import { availableMonths } from "@/lib/metrics";
import { parsePeriod } from "@/lib/period";
import { PeriodFilter } from "../PeriodFilter";

export default async function ExportarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const params = await searchParams;
  const selectedMonths = parsePeriod(params);
  const somenteCorrigidos = params.somenteCorrigidos === "1";

  const records = await getValidRecordsForMetrics();
  const months = availableMonths(records);

  const whereMonths =
    selectedMonths === null
      ? undefined
      : {
          OR: [...selectedMonths].map((mes) => {
            const [ano, mm] = mes.split("-").map(Number);
            const start = new Date(Date.UTC(ano, mm - 1, 1));
            const end = new Date(Date.UTC(ano, mm, 1));
            return { data: { gte: start, lt: end } };
          }),
        };

  const totalDisponivel = await prisma.fuelRecord.count({
    where: { hasError: false, ...(somenteCorrigidos ? { corrected: true } : {}), ...whereMonths },
  });
  const totalComErro = await prisma.fuelRecord.count({
    where: { hasError: true, ...whereMonths },
  });

  const downloadParams = new URLSearchParams();
  if (selectedMonths) for (const m of selectedMonths) downloadParams.append("mes", m);
  if (somenteCorrigidos) downloadParams.set("somenteCorrigidos", "1");

  const toggleCorrigidosHref = (() => {
    const sp = new URLSearchParams();
    if (selectedMonths) for (const m of selectedMonths) sp.append("mes", m);
    if (!somenteCorrigidos) sp.set("somenteCorrigidos", "1");
    return `/exportar?${sp.toString()}`;
  })();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exportar dados ajustados</h1>
        <p className="text-sm text-slate-500">
          Baixe os abastecimentos já validados (sem erros) em uma planilha .xlsx, filtrando
          pelo período desejado.
        </p>
      </div>

      <PeriodFilter availableMonths={months} selectedMonths={selectedMonths ? [...selectedMonths] : null} />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-white p-4">
        <Link
          href={toggleCorrigidosHref}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            somenteCorrigidos
              ? "bg-brand-600 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {somenteCorrigidos ? "Mostrando apenas registros corrigidos" : "Incluir todos os registros válidos"}
        </Link>

        <div className="text-sm text-slate-600">
          <strong>{totalDisponivel}</strong> registro(s) prontos para exportação
          {totalComErro > 0 && (
            <>
              {" "}
              · <span className="text-red-600">{totalComErro} com erro (não incluídos)</span>
            </>
          )}
        </div>

        <a
          href={`/api/export?${downloadParams.toString()}`}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          ⬇ Baixar planilha (.xlsx)
        </a>
      </div>

      {totalComErro > 0 && (
        <p className="text-sm text-slate-500">
          Existem abastecimentos com erro no período selecionado. Corrija-os na tela{" "}
          <Link href="/abastecimentos?erro=1" className="font-medium text-brand-600 hover:underline">
            Abastecimentos
          </Link>{" "}
          para incluí-los na exportação.
        </p>
      )}
    </div>
  );
}
