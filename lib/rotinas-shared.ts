/**
 * Utilidades puras do módulo Check de rotina — sem acesso ao banco, então
 * servem tanto ao servidor quanto às telas.
 *
 * Datas de rotina são sempre strings "AAAA-MM-DD" no fuso da Bahia; no banco
 * ficam em colunas DATE.
 */

export const FUSO = "America/Bahia";

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const MOTIVOS_NAO_EXECUCAO = [
  "Veículo indisponível / em manutenção",
  "Falta de pessoal",
  "Condições climáticas",
  "Cliente fechado / sem acesso",
  "Prioridade alterada pela liderança",
  "Falta de material ou EPI",
  "Outro",
] as const;

export const STATUS = ["FEITO", "NAO_FEITO"] as const;
export type StatusRegistro = (typeof STATUS)[number];

export const FREQUENCIAS = ["SEMANAL", "MENSAL"] as const;
export type Frequencia = (typeof FREQUENCIAS)[number];

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function diaValido(s: unknown): s is string {
  if (typeof s !== "string" || !DIA_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Data de hoje na Bahia, "AAAA-MM-DD". */
export function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" → Date para gravar numa coluna DATE. */
export function paraData(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Date de uma coluna DATE → "AAAA-MM-DD". */
export function deData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

export function formatarDiaLongo(dia: string): string {
  const s = new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatarDiaCurto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}

export function horaBahia(d: Date | string): string {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
}

export interface RotinaAgenda {
  frequencia: string;
  diasSemana: number[];
  diaMes: number | null;
  inicio: string;
}

/** A rotina está programada para esse dia? (não considera se está pausada) */
export function programadaNoDia(r: RotinaAgenda, dia: string): boolean {
  if (dia < r.inicio) return false;
  if (r.frequencia === "MENSAL") return Number(dia.slice(8, 10)) === r.diaMes;
  return r.diasSemana.includes(diaDaSemana(dia));
}

export function descreverFrequencia(r: Pick<RotinaAgenda, "frequencia" | "diasSemana" | "diaMes">): string {
  if (r.frequencia === "MENSAL") return `Todo dia ${r.diaMes} do mês`;
  const k = [...r.diasSemana].sort((a, b) => a - b).join("");
  if (k === "0123456") return "Todos os dias";
  if (k === "12345") return "Seg a Sex";
  if (k === "123456") return "Seg a Sáb";
  return [...r.diasSemana]
    .sort((a, b) => a - b)
    .map((i) => DIAS_SEMANA[i])
    .join(", ");
}
