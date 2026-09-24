import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canEditData, TIPOS_VEICULO_SUGERIDOS } from "@/lib/roles";
import { getValidRecordsForMetrics, getVehicleCurrentKm } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { VehicleRow, type VehicleRowData } from "./VehicleRow";
import { VEHICLE_COL_WIDTHS } from "./columnWidths";
import { SearchBox } from "../SearchBox";
import { UnitFilter } from "../UnitFilter";

const SORTABLE_FIELDS = ["placa", "marca", "modelo", "tipoVeiculo", "unidade", "kmAtual", "media"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export default async function VeiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const canEdit = canEditData(user.role);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const unidade = typeof params.unidade === "string" ? params.unidade : "";
  const sortParam = typeof params.sort === "string" ? params.sort : undefined;
  const currentSort: SortableField = SORTABLE_FIELDS.includes(sortParam as SortableField)
    ? (sortParam as SortableField)
    : "placa";
  const currentDir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";

  const [vehicles, records] = await Promise.all([
    prisma.vehicle.findMany({ where: unidade ? { unidade } : undefined, orderBy: { placa: "asc" } }),
    getValidRecordsForMetrics(unidade || undefined),
  ]);

  const { byVehicle } = computeMetrics(records, null);
  const mediaByVehicle = new Map(byVehicle.map((v) => [v.vehicleId, v]));
  const kmMap = await getVehicleCurrentKm();

  let rows: VehicleRowData[] = vehicles.map((v) => {
    const agg = mediaByVehicle.get(v.id);
    return {
      id: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anoModelo: v.anoModelo,
      anoFabricacao: v.anoFabricacao,
      tipoVeiculo: v.tipoVeiculo,
      capacidadeTanque: v.capacidadeTanque,
      unidade: v.unidade,
      ativo: v.ativo,
      kmAtual: kmMap.get(v.id) ?? null,
      media: agg?.media ?? null,
      registros: agg?.registros ?? 0,
    };
  });

  if (q) {
    rows = rows.filter((v) =>
      [v.placa, v.marca, v.modelo, v.tipoVeiculo, v.unidade].some((field) => field?.toLowerCase().includes(q)),
    );
  }

  const dirMultiplier = currentDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    const av = a[currentSort];
    const bv = b[currentSort];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * dirMultiplier;
    }
    return ((av as number) - (bv as number)) * dirMultiplier;
  });

  function baseParams() {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (unidade) sp.set("unidade", unidade);
    return sp;
  }

  function sortHref(column: SortableField) {
    const sp = baseParams();
    const nextDir: "asc" | "desc" = currentSort === column && currentDir === "asc" ? "desc" : "asc";
    sp.set("sort", column);
    sp.set("dir", nextDir);
    return `/veiculos?${sp.toString()}`;
  }

  function sortTh(label: string, column: SortableField, align: "left" | "right" = "left") {
    const active = currentSort === column;
    return (
      <th
        key={column}
        className={`sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 ${align === "right" ? "text-right" : ""}`}
      >
        <Link
          href={sortHref(column)}
          className={`inline-flex items-center gap-1 hover:text-brand-700 ${active ? "text-brand-700" : ""}`}
        >
          {label}
          {active && <span aria-hidden>{currentDir === "asc" ? "▲" : "▼"}</span>}
        </Link>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Veículos</h1>
          <p className="text-sm text-slate-500">
            {rows.length} de {vehicles.length} veículo(s) {q && "encontrados"}
            {!q && "cadastrados"}
          </p>
        </div>
        <Link href="/metas" className="text-sm font-medium text-brand-600 hover:underline">
          Ver metas de consumo →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchBox initialValue={q} placeholder="Buscar por placa, marca, modelo ou tipo..." />
        <UnitFilter initialValue={unidade} />
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-brand-100 bg-white">
        <table
          className="table-fixed text-sm"
          style={{
            width:
              VEHICLE_COL_WIDTHS.placa +
              VEHICLE_COL_WIDTHS.marca +
              VEHICLE_COL_WIDTHS.modelo +
              VEHICLE_COL_WIDTHS.anoModelo +
              VEHICLE_COL_WIDTHS.anoFabricacao +
              VEHICLE_COL_WIDTHS.tipo +
              VEHICLE_COL_WIDTHS.capacidade +
              VEHICLE_COL_WIDTHS.unidade +
              VEHICLE_COL_WIDTHS.kmAtual +
              VEHICLE_COL_WIDTHS.media +
              VEHICLE_COL_WIDTHS.situacao +
              (canEdit ? VEHICLE_COL_WIDTHS.acoes : 0),
          }}
        >
          <colgroup>
            <col style={{ width: VEHICLE_COL_WIDTHS.placa }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.marca }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.modelo }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.anoModelo }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.anoFabricacao }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.tipo }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.capacidade }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.unidade }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.kmAtual }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.media }} />
            <col style={{ width: VEHICLE_COL_WIDTHS.situacao }} />
            {canEdit && <col style={{ width: VEHICLE_COL_WIDTHS.acoes }} />}
          </colgroup>
          <thead>
            <tr className="border-b border-brand-100 bg-slate-50 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
              {sortTh("Placa", "placa")}
              {sortTh("Marca", "marca")}
              {sortTh("Modelo", "modelo")}
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Ano modelo</th>
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Ano fabricação</th>
              {sortTh("Tipo", "tipoVeiculo")}
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">Capacidade</th>
              {sortTh("Unidade", "unidade")}
              {sortTh("KM atual", "kmAtual", "right")}
              {sortTh("Média geral", "media", "right")}
              <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Situação</th>
              {canEdit && (
                <th className="sticky right-0 top-0 z-20 whitespace-nowrap border-l border-brand-100 bg-slate-50 px-3 py-2 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.15)]">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                  {vehicles.length === 0
                    ? "Nenhum veículo cadastrado. Importe uma planilha de abastecimentos para começar."
                    : "Nenhum veículo encontrado para essa busca."}
                </td>
              </tr>
            )}
            {rows.map((v) => (
              <VehicleRow key={v.id} vehicle={v} canEdit={canEdit} />
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="tipos-veiculo-sugeridos">
        {TIPOS_VEICULO_SUGERIDOS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}
