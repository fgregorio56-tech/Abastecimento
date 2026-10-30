import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/session";
import { parsePeriod } from "@/lib/period";
import { PeriodFilter } from "../PeriodFilter";
import { UnitFilter } from "../UnitFilter";

const STATUS_VALUES = ["validos", "pendentes", "todos"] as const;
type StatusFiltro = (typeof STATUS_VALUES)[number];

const STATUS_LABELS: Record<StatusFiltro, string> = {
  validos: "Válidos",
  pendentes: "Pendentes",
  todos: "Todos",
};

export default async function ExportarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireModule("ABASTECIMENTO");
  const params = await searchParams;
  const selectedMonths = parsePeriod(params);
  const somenteCorrigidos = params.somenteCorrigidos === "1";
  const unidade = typeof params.unidade === "string" ? params.unidade : "";
  const statusParam = typeof params.status === "string" ? params.status : "";
  const status: StatusFiltro = STATUS_VALUES.includes(statusParam as StatusFiltro)
    ? (statusParam as StatusFiltro)
    : "validos";

  // Meses disponíveis considerando todos os abastecimentos (válidos e
  // pendentes), pra que o filtro de período funcione também ao exportar
  // pendências que ainda não entraram nas métricas oficiais.
  const datasDisponiveis = await prisma.fuelRecord.findMany({
    where: { data: { not: null } },
    select: { data: true },
  });
  const months = [...new Set(datasDisponiveis.map((r) => r.data!.toISOString().slice(0, 7)))].sort();

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
  const whereUnidade = unidade ? { vehicle: { unidade } } : {};

  const totalValidos = await prisma.fuelRecord.count({
    where: {
      hasError: false,
      ...(somenteCorrigidos ? { corrected: true } : {}),
      ...whereMonths,
      ...whereUnidade,
    },
  });
  const totalPendentes = await prisma.fuelRecord.count({
    where: { hasError: true, ...whereMonths, ...whereUnidade },
  });
  const totalParaExportar =
    status === "pendentes" ? totalPendentes : status === "todos" ? totalValidos + totalPendentes : totalValidos;

  function buildHref(overrides: { status?: StatusFiltro; somenteCorrigidos?: boolean }) {
    const sp = new URLSearchParams();
    if (selectedMonths) for (const m of selectedMonths) sp.append("mes", m);
    const nextStatus = overrides.status ?? status;
    if (nextStatus !== "validos") sp.set("status", nextStatus);
    const nextCorrigidos = overrides.somenteCorrigidos ?? somenteCorrigidos;
    if (nextCorrigidos) sp.set("somenteCorrigidos", "1");
    if (unidade) sp.set("unidade", unidade);
    return `/exportar?${sp.toString()}`;
  }

  const downloadParams = new URLSearchParams();
  if (selectedMonths) for (const m of selectedMonths) downloadParams.append("mes", m);
  if (status !== "validos") downloadParams.set("status", status);
  if (somenteCorrigidos) downloadParams.set("somenteCorrigidos", "1");
  if (unidade) downloadParams.set("unidade", unidade);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exportar dados</h1>
        <p className="text-sm text-slate-500">
          Baixe os abastecimentos do sistema em uma planilha .xlsx — escolha entre os já validados,
          os pendentes de correção ou todos juntos, filtrando pelo período desejado.
        </p>
      </div>

      <UnitFilter initialValue={unidade} />

      <PeriodFilter availableMonths={months} selectedMonths={selectedMonths ? [...selectedMonths] : null} />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-white p-4">
        <div className="flex gap-2">
          {STATUS_VALUES.map((s) => (
            <Link
              key={s}
              href={buildHref({ status: s })}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                status === s
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>

        {status !== "pendentes" && (
          <Link
            href={buildHref({ somenteCorrigidos: !somenteCorrigidos })}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              somenteCorrigidos
                ? "bg-slate-700 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {somenteCorrigidos ? "Mostrando apenas corrigidos" : "Incluir todos os válidos"}
          </Link>
        )}

        <div className="text-sm text-slate-600">
          <strong>{totalParaExportar}</strong> registro(s) prontos para exportação
          {status === "validos" && totalPendentes > 0 && (
            <>
              {" "}
              · <span className="text-red-600">{totalPendentes} pendente(s) (não incluídos)</span>
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

      {status === "validos" && totalPendentes > 0 && (
        <p className="text-sm text-slate-500">
          Existem abastecimentos pendentes no período selecionado. Corrija-os na tela{" "}
          <Link href="/pendencias" className="font-medium text-brand-600 hover:underline">
            Pendências
          </Link>{" "}
          pra incluí-los como válidos, ou use o filtro &quot;Pendentes&quot;/&quot;Todos&quot; acima pra
          baixá-los assim mesmo.
        </p>
      )}
    </div>
  );
}
