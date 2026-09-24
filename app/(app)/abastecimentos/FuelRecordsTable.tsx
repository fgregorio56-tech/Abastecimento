"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EditableRow, type RowData } from "./EditableRow";
import { deleteMultipleFuelRecords } from "./actions";

export interface SortLinks {
  placaTexto: string;
  data: string;
  km: string;
  litros: string;
}

// Larguras fixas por coluna (table-layout: fixed) — evita que a coluna de
// Situação (única com texto que quebra linha) seja espremida até sumir
// quando a tabela fica maior que a tela, o que desalinhava as linhas e
// fazia o conteúdo ficar escondido atrás da coluna de Ações fixada.
const COL_WIDTHS = {
  checkbox: 36,
  placa: 92,
  data: 108,
  km: 96,
  kmAnterior: 108,
  kmRodado: 100,
  media: 84,
  litros: 84,
  combustivel: 116,
  origem: 130,
  motorista: 160,
  posto: 160,
  situacao: 220,
  acoes: 150,
};

function SortableTh({
  label,
  column,
  href,
  currentSort,
  currentDir,
  align = "left",
}: {
  label: string;
  column: string;
  href?: string;
  currentSort?: string;
  currentDir?: "asc" | "desc";
  align?: "left" | "right";
}) {
  if (!href) {
    return (
      <th
        className={`sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 ${align === "right" ? "text-right" : ""}`}
      >
        {label}
      </th>
    );
  }
  const active = currentSort === column;
  return (
    <th
      className={`sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 ${align === "right" ? "text-right" : ""}`}
    >
      <Link
        href={href}
        className={`inline-flex items-center gap-1 hover:text-brand-700 ${active ? "text-brand-700" : ""}`}
      >
        {label}
        {active && <span aria-hidden>{currentDir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </th>
  );
}

export function FuelRecordsTable({
  rows,
  canEdit,
  sortLinks,
  currentSort,
  currentDir,
}: {
  rows: RowData[];
  canEdit: boolean;
  sortLinks?: SortLinks;
  currentSort?: string;
  currentDir?: "asc" | "desc";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} abastecimento(s) selecionado(s)? Essa ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(async () => {
      await deleteMultipleFuelRecords([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  const colSpan = canEdit ? 14 : 12;
  const tableWidth =
    (canEdit ? COL_WIDTHS.checkbox : 0) +
    COL_WIDTHS.placa +
    COL_WIDTHS.data +
    COL_WIDTHS.km +
    COL_WIDTHS.kmAnterior +
    COL_WIDTHS.kmRodado +
    COL_WIDTHS.media +
    COL_WIDTHS.litros +
    COL_WIDTHS.combustivel +
    COL_WIDTHS.origem +
    COL_WIDTHS.motorista +
    COL_WIDTHS.posto +
    COL_WIDTHS.situacao +
    (canEdit ? COL_WIDTHS.acoes : 0);

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-brand-100 bg-white">
      {canEdit && selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50 px-3 py-2">
          <span className="text-sm font-medium text-brand-800">{selected.size} selecionado(s)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white"
            >
              Limpar seleção
            </button>
            <button
              onClick={bulkDelete}
              disabled={isPending}
              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Excluir selecionados
            </button>
          </div>
        </div>
      )}
      <table className="table-fixed text-sm" style={{ width: tableWidth }}>
        <colgroup>
          {canEdit && <col style={{ width: COL_WIDTHS.checkbox }} />}
          <col style={{ width: COL_WIDTHS.placa }} />
          <col style={{ width: COL_WIDTHS.data }} />
          <col style={{ width: COL_WIDTHS.km }} />
          <col style={{ width: COL_WIDTHS.kmAnterior }} />
          <col style={{ width: COL_WIDTHS.kmRodado }} />
          <col style={{ width: COL_WIDTHS.media }} />
          <col style={{ width: COL_WIDTHS.litros }} />
          <col style={{ width: COL_WIDTHS.combustivel }} />
          <col style={{ width: COL_WIDTHS.origem }} />
          <col style={{ width: COL_WIDTHS.situacao }} />
          <col style={{ width: COL_WIDTHS.motorista }} />
          <col style={{ width: COL_WIDTHS.posto }} />
          {canEdit && <col style={{ width: COL_WIDTHS.acoes }} />}
        </colgroup>
        <thead>
          <tr className="border-b border-brand-100 bg-slate-50 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
            {canEdit && (
              <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
            )}
            <SortableTh label="Placa" column="placaTexto" href={sortLinks?.placaTexto} currentSort={currentSort} currentDir={currentDir} />
            <SortableTh label="Data" column="data" href={sortLinks?.data} currentSort={currentSort} currentDir={currentDir} />
            <SortableTh label="KM" column="km" href={sortLinks?.km} currentSort={currentSort} currentDir={currentDir} align="right" />
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">KM anterior</th>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">KM rodado</th>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-right">Média</th>
            <SortableTh label="Litros" column="litros" href={sortLinks?.litros} currentSort={currentSort} currentDir={currentDir} align="right" />
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Combustível</th>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Origem</th>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Situação</th>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Motorista</th>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2">Posto</th>
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
              <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-500">
                Nenhum abastecimento encontrado.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <EditableRow
              key={r.id}
              row={r}
              canEdit={canEdit}
              selected={selected.has(r.id)}
              onToggleSelect={canEdit ? toggle : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
