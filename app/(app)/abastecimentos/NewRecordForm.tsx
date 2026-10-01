"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFuelRecord, getPreviousKmPreview } from "./actions";
import { formatKm } from "@/lib/format";
import { FUEL_TYPES, FUEL_TYPE_LABELS, ORIGENS, ORIGEM_LABELS, POSTO_INTERNO_LABEL } from "@/lib/roles";

export function NewRecordForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [placa, setPlaca] = useState("");
  const [data, setData] = useState("");
  const [km, setKm] = useState("");
  const [litros, setLitros] = useState("");
  const [valorLitro, setValorLitro] = useState("");
  const [combustivel, setCombustivel] = useState<string>("DIESEL");
  const [origem, setOrigem] = useState<string>("EXTERNO");
  const [posto, setPosto] = useState("");
  const [kmAnteriorPreview, setKmAnteriorPreview] = useState<number | null>(null);
  const previewRequestId = useRef(0);

  const litrosNum = Number(litros.replace(",", "."));
  const valorLitroNum = Number(valorLitro.replace(",", "."));
  const valorTotal =
    litros && valorLitro && Number.isFinite(litrosNum) && Number.isFinite(valorLitroNum)
      ? litrosNum * valorLitroNum
      : null;

  useEffect(() => {
    const requestId = ++previewRequestId.current;
    if (!open || !placa || !data) {
      const handle = setTimeout(() => {
        if (previewRequestId.current === requestId) setKmAnteriorPreview(null);
      }, 0);
      return () => clearTimeout(handle);
    }
    const handle = setTimeout(() => {
      getPreviousKmPreview(placa, data).then((result) => {
        if (previewRequestId.current === requestId) setKmAnteriorPreview(result.kmAnterior);
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [open, placa, data]);

  function reset() {
    setPlaca("");
    setData("");
    setKm("");
    setLitros("");
    setValorLitro("");
    setCombustivel("DIESEL");
    setOrigem("EXTERNO");
    setPosto("");
    setKmAnteriorPreview(null);
  }

  function handleOrigemChange(value: string) {
    setOrigem(value);
    setPosto(value === "INTERNO" ? POSTO_INTERNO_LABEL : "");
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await createFuelRecord({ placa, data, km, litros, valorLitro, combustivel, origem, posto });
      if (!result.ok) {
        setError(result.error ?? "Erro ao lançar o abastecimento.");
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        + Novo abastecimento
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Novo abastecimento (lançamento manual)</h2>
        <button
          onClick={() => {
            setOpen(false);
            reset();
            setError(null);
          }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Fechar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Placa</label>
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm uppercase"
            placeholder="ABC1D23"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">KM atual</label>
          <input
            value={km}
            onChange={(e) => setKm(e.target.value)}
            inputMode="decimal"
            className="rounded border border-slate-300 px-2 py-1.5 text-right text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">KM anterior</label>
          <div className="flex h-[30px] items-center justify-end rounded border border-dashed border-slate-200 bg-slate-50 px-2 text-sm text-slate-500">
            {placa && data ? formatKm(kmAnteriorPreview) : "—"}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Litragem</label>
          <input
            value={litros}
            onChange={(e) => setLitros(e.target.value)}
            inputMode="decimal"
            className="rounded border border-slate-300 px-2 py-1.5 text-right text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Valor unitário (R$)</label>
          <input
            value={valorLitro}
            onChange={(e) => setValorLitro(e.target.value)}
            inputMode="decimal"
            className="rounded border border-slate-300 px-2 py-1.5 text-right text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Combustível</label>
          <select
            value={combustivel}
            onChange={(e) => setCombustivel(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {FUEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {FUEL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Origem</label>
          <select
            value={origem}
            onChange={(e) => handleOrigemChange(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {ORIGEM_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Posto</label>
          <input
            value={posto}
            onChange={(e) => setPosto(e.target.value)}
            disabled={origem === "INTERNO"}
            placeholder={origem === "INTERNO" ? "" : "Nome do posto"}
            className={`rounded border px-2 py-1.5 text-sm ${
              origem === "INTERNO" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-300"
            }`}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Valor total: <span className="font-semibold text-slate-900">{valorTotal !== null ? valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</span>
          <span className="ml-1 text-xs text-slate-400">(calculado automaticamente)</span>
        </p>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={save}
            disabled={isPending || !placa || !data}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? "Lançando..." : "Lançar abastecimento"}
          </button>
        </div>
      </div>
    </div>
  );
}
