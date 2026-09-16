import * as XLSX from "xlsx";
import { FUEL_TYPE_LABELS, type FuelType } from "@/lib/roles";

export interface ExportRow {
  placa: string;
  data: Date | null;
  km: number | null;
  litros: number | null;
  valorLitro: number | null;
  valorTotal: number | null;
  posto: string | null;
  combustivel: string;
  motorista: string | null;
  corrected: boolean;
  hasError: boolean;
}

export function buildExportWorkbook(rows: ExportRow[]): Buffer {
  const sheetData = rows.map((r) => ({
    Placa: r.placa,
    Data: r.data ? r.data.toISOString().slice(0, 10) : "",
    KM: r.km ?? "",
    Litros: r.litros ?? "",
    "Valor/Litro": r.valorLitro ?? "",
    "Valor Total": r.valorTotal ?? "",
    Posto: r.posto ?? "",
    Combustível: FUEL_TYPE_LABELS[r.combustivel as FuelType] ?? r.combustivel,
    Motorista: r.motorista ?? "",
    Corrigido: r.corrected ? "Sim" : "Não",
    "Com erro": r.hasError ? "Sim" : "Não",
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Abastecimentos");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
