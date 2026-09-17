import * as XLSX from "xlsx";
import { normalizePlaca } from "@/lib/placa";

export interface ParsedRow {
  placaTexto: string;
  data: Date | null;
  km: number | null;
  litros: number | null;
  valorLitro: number | null;
  valorTotal: number | null;
  posto: string | null;
  combustivel: string | null;
  origem: string | null;
  motorista: string | null;
  marca: string | null;
  modelo: string | null;
  anoModelo: number | null;
  anoFabricacao: number | null;
  linhaOriginal: number;
}

function normalizeHeader(header: string): string {
  return header
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_SYNONYMS: Record<string, keyof ParsedRow> = {
  placa: "placaTexto",
  veiculo: "placaTexto",
  carro: "placaTexto",
  data: "data",
  dataabastecimento: "data",
  dt: "data",
  km: "km",
  kmatual: "km",
  hodometro: "km",
  quilometragem: "km",
  litros: "litros",
  litragem: "litros",
  qtdlitros: "litros",
  quantidade: "litros",
  quantidadelitros: "litros",
  valorlitro: "valorLitro",
  vllitro: "valorLitro",
  precolitro: "valorLitro",
  valorunitario: "valorLitro",
  valortotal: "valorTotal",
  total: "valorTotal",
  valor: "valorTotal",
  posto: "posto",
  fornecedor: "posto",
  local: "posto",
  combustivel: "combustivel",
  tipocombustivel: "combustivel",
  origem: "origem",
  tipoabastecimento: "origem",
  internoexterno: "origem",
  motorista: "motorista",
  condutor: "motorista",
  marca: "marca",
  modelo: "modelo",
  anomodelo: "anoModelo",
  ano: "anoModelo",
  anofabricacao: "anoFabricacao",
  anofab: "anoFabricacao",
};

const FUEL_TYPE_SYNONYMS: Record<string, string> = {
  diesel: "DIESEL",
  dieseis10: "DIESEL_S10",
  diesels10: "DIESEL_S10",
  s10: "DIESEL_S10",
  gasolina: "GASOLINA",
  etanol: "ETANOL",
  alcool: "ETANOL",
  gnv: "GNV",
  arla: "ARLA",
  arla32: "ARLA",
  lubrificante: "LUBRIFICANTE",
  oleo: "LUBRIFICANTE",
  oleolubrificante: "LUBRIFICANTE",
};

const ORIGEM_SYNONYMS: Record<string, string> = {
  interno: "INTERNO",
  int: "INTERNO",
  frota: "INTERNO",
  bombainterna: "INTERNO",
  externo: "EXTERNO",
  ext: "EXTERNO",
  posto: "EXTERNO",
};

function excelSerialToDate(serial: number): Date {
  // Excel epoch (1900 system), com ajuste do bug do ano bissexto de 1900.
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractional = serial - Math.floor(serial);
  const seconds = Math.round(fractional * 86400);
  return new Date(dateInfo.getTime() + seconds * 1000);
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = excelSerialToDate(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = value.toString().trim();
  if (!text) return null;

  const brMatch = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? Number(`20${y}`) : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = value.toString().trim();
  if (!text) return null;
  text = text.replace(/[^\d,.\-]/g, "");
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
  });

  return rawRows.map((row, index) => {
    const mapped: Partial<ParsedRow> = {};
    for (const [rawHeader, value] of Object.entries(row)) {
      const key = HEADER_SYNONYMS[normalizeHeader(rawHeader)];
      if (!key) continue;

      switch (key) {
        case "data":
          mapped.data = parseDate(value);
          break;
        case "km":
          mapped.km = parseNumber(value);
          break;
        case "litros":
        case "valorLitro":
        case "valorTotal":
          mapped[key] = parseNumber(value);
          break;
        case "anoModelo":
        case "anoFabricacao":
          mapped[key] = parseNumber(value) ? Math.round(parseNumber(value)!) : null;
          break;
        case "combustivel": {
          const norm = normalizeHeader(String(value ?? ""));
          mapped.combustivel = FUEL_TYPE_SYNONYMS[norm] ?? "OUTRO";
          break;
        }
        case "origem": {
          const norm = normalizeHeader(String(value ?? ""));
          mapped.origem = ORIGEM_SYNONYMS[norm] ?? "EXTERNO";
          break;
        }
        case "placaTexto":
          mapped.placaTexto = normalizePlaca(String(value ?? ""));
          break;
        default:
          (mapped as Record<string, unknown>)[key] = value ? String(value).trim() : null;
      }
    }

    return {
      placaTexto: mapped.placaTexto ?? "",
      data: mapped.data ?? null,
      km: mapped.km ?? null,
      litros: mapped.litros ?? null,
      valorLitro: mapped.valorLitro ?? null,
      valorTotal: mapped.valorTotal ?? null,
      posto: mapped.posto ?? null,
      combustivel: mapped.combustivel ?? "DIESEL",
      origem: mapped.origem ?? "EXTERNO",
      motorista: mapped.motorista ?? null,
      marca: mapped.marca ?? null,
      modelo: mapped.modelo ?? null,
      anoModelo: mapped.anoModelo ?? null,
      anoFabricacao: mapped.anoFabricacao ?? null,
      linhaOriginal: index + 2,
    };
  });
}
