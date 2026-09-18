"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateVehicle } from "./actions";
import { formatKm, formatMedia } from "@/lib/format";
import { UNIDADES } from "@/lib/roles";

export interface VehicleRowData {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anoModelo: number | null;
  anoFabricacao: number | null;
  tipoVeiculo: string | null;
  capacidadeTanque: number | null;
  unidade: string | null;
  ativo: boolean;
  kmAtual: number | null;
  media: number | null;
  registros: number;
}

export function VehicleRow({ vehicle, canEdit }: { vehicle: VehicleRowData; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [marca, setMarca] = useState(vehicle.marca ?? "");
  const [modelo, setModelo] = useState(vehicle.modelo ?? "");
  const [anoModelo, setAnoModelo] = useState(vehicle.anoModelo?.toString() ?? "");
  const [anoFabricacao, setAnoFabricacao] = useState(vehicle.anoFabricacao?.toString() ?? "");
  const [tipoVeiculo, setTipoVeiculo] = useState(vehicle.tipoVeiculo ?? "");
  const [capacidadeTanque, setCapacidadeTanque] = useState(vehicle.capacidadeTanque?.toString() ?? "");
  const [unidade, setUnidade] = useState(vehicle.unidade ?? "");
  const [ativo, setAtivo] = useState(vehicle.ativo);

  function save() {
    startTransition(async () => {
      await updateVehicle(vehicle.id, {
        marca,
        modelo,
        anoModelo,
        anoFabricacao,
        tipoVeiculo,
        capacidadeTanque,
        unidade,
        ativo,
      });
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-100 bg-amber-50">
        <td className="px-3 py-2 font-medium text-slate-900">{vehicle.placa}</td>
        <td className="px-3 py-2">
          <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" className="w-28 rounded border border-slate-300 px-2 py-1 text-sm" />
        </td>
        <td className="px-3 py-2">
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo" className="w-28 rounded border border-slate-300 px-2 py-1 text-sm" />
        </td>
        <td className="px-3 py-2">
          <input value={anoModelo} onChange={(e) => setAnoModelo(e.target.value)} placeholder="Ano" inputMode="numeric" className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
        </td>
        <td className="px-3 py-2">
          <input value={anoFabricacao} onChange={(e) => setAnoFabricacao(e.target.value)} placeholder="Fab." inputMode="numeric" className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
        </td>
        <td className="px-3 py-2">
          <input
            value={tipoVeiculo}
            onChange={(e) => setTipoVeiculo(e.target.value)}
            placeholder="Tipo"
            list="tipos-veiculo-sugeridos"
            className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={capacidadeTanque}
            onChange={(e) => setCapacidadeTanque(e.target.value)}
            placeholder="Litros"
            inputMode="decimal"
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">Sem unidade</option>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatKm(vehicle.kmAtual)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatMedia(vehicle.media)}</td>
        <td className="px-3 py-2">
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Ativo
          </label>
        </td>
        <td className="flex gap-2 px-3 py-2">
          <button onClick={save} disabled={isPending} className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            Salvar
          </button>
          <button onClick={() => setEditing(false)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-slate-100 ${!vehicle.ativo ? "opacity-50" : ""}`}>
      <td className="px-3 py-2 font-medium text-slate-900">{vehicle.placa}</td>
      <td className="px-3 py-2 text-slate-600">{vehicle.marca ?? "—"}</td>
      <td className="px-3 py-2 text-slate-600">{vehicle.modelo ?? "—"}</td>
      <td className="px-3 py-2 text-slate-600">{vehicle.anoModelo ?? "—"}</td>
      <td className="px-3 py-2 text-slate-600">{vehicle.anoFabricacao ?? "—"}</td>
      <td className="px-3 py-2 text-slate-600">{vehicle.tipoVeiculo ?? "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
        {vehicle.capacidadeTanque ? `${vehicle.capacidadeTanque} L` : "—"}
      </td>
      <td className="px-3 py-2 text-slate-600">{vehicle.unidade ?? "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatKm(vehicle.kmAtual)}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{formatMedia(vehicle.media)}</td>
      <td className="px-3 py-2">
        {vehicle.ativo ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Ativo</span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Inativo</span>
        )}
      </td>
      {canEdit && (
        <td className="px-3 py-2">
          <button onClick={() => setEditing(true)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Editar
          </button>
        </td>
      )}
    </tr>
  );
}
