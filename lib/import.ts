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
  tipoVeiculo: string | null;
  capacidadeTanque: number | null;
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
  datatransacao: "data",
  dataemissao: "data",
  dtabastecimento: "data",
  inicioabastecimento: "data",
  dt: "data",
  km: "km",
  kmatual: "km",
  kmveiculo: "km",
  hodometro: "km",
  hodometroouhorimetro: "km",
  quilometragem: "km",
  litros: "litros",
  litragem: "litros",
  qtdlitros: "litros",
  qtdlitro: "litros",
  quantidade: "litros",
  quantidadelitros: "litros",
  valorlitro: "valorLitro",
  vllitro: "valorLitro",
  vlrunit: "valorLitro",
  precolitro: "valorLitro",
  valorunitario: "valorLitro",
  valortotal: "valorTotal",
  vlrtotal: "valorTotal",
  valoremissao: "valorTotal",
  total: "valorTotal",
  valor: "valorTotal",
  posto: "posto",
  fornecedor: "posto",
  local: "posto",
  parceiroposto: "posto",
  nomeestabelecimento: "posto",
  combustivel: "combustivel",
  tipocombustivel: "combustivel",
  descrprod: "combustivel",
  origem: "origem",
  tipoabastecimento: "origem",
  internoexterno: "origem",
  tipointernoouexterno: "origem",
  motorista: "motorista",
  nomemotorista: "motorista",
  condutor: "motorista",
  marca: "marca",
  modelo: "modelo",
  modeloveiculo: "modelo",
  anomodelo: "anoModelo",
  ano: "anoModelo",
  anofabricacao: "anoFabricacao",
  anofab: "anoFabricacao",
  tipoveiculo: "tipoVeiculo",
  tipo: "tipoVeiculo",
  capacidadetanque: "capacidadeTanque",
  capacidade: "capacidadeTanque",
};

/** Classifica o combustível a partir de um texto livre (ex.: descrição do produto). */
function classifyFuel(rawValue: string): string {
  const norm = normalizeHeader(rawValue);
  if (!norm) return "OUTRO";
  if (norm.includes("arla")) return "ARLA";
  if (norm.includes("diesel")) return norm.includes("s10") ? "DIESEL_S10" : "DIESEL";
  if (norm.includes("gasolina")) return "GASOLINA";
  if (norm.includes("etanol") || norm.includes("alcool")) return "ETANOL";
  if (norm.includes("gnv")) return "GNV";
  if (norm.includes("lubrific") || norm.includes("oleo")) return "LUBRIFICANTE";
  return "OUTRO";
}

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

/**
 * Planilhas exportadas de diferentes sistemas às vezes têm linhas de
 * cabeçalho/rodapé antes da linha real de colunas (ex.: "Emissão: ...").
 * Escolhe, entre as primeiras linhas, a que mais bate com os cabeçalhos
 * reconhecidos, em vez de assumir sempre a linha 0.
 */
function findHeaderRowIndex(sheet: XLSX.WorkSheet): number {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  let bestIndex = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const score = rows[i].filter(
      (cell) => cell != null && HEADER_SYNONYMS[normalizeHeader(String(cell))],
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= 2 ? bestIndex : 0;
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const headerRowIndex = findHeaderRowIndex(sheet);
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
    range: headerRowIndex,
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
        case "capacidadeTanque":
          mapped.capacidadeTanque = parseNumber(value);
          break;
        case "combustivel":
          mapped.combustivel = classifyFuel(String(value ?? ""));
          break;
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
      tipoVeiculo: mapped.tipoVeiculo ?? null,
      capacidadeTanque: mapped.capacidadeTanque ?? null,
      linhaOriginal: index + headerRowIndex + 2,
    };
  });
}
