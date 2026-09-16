export function formatNumber(value: number | null, decimals = 0): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKm(value: number | null): string {
  return value === null ? "—" : `${formatNumber(value)} km`;
}

export function formatLitros(value: number | null): string {
  return value === null ? "—" : `${formatNumber(value, 1)} L`;
}

export function formatMedia(value: number | null): string {
  return value === null ? "—" : `${formatNumber(value, 2)} km/l`;
}

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatMonthLong(mes: string): string {
  const [ano, mm] = mes.split("-");
  return `${MESES_PT[Number(mm) - 1]} de ${ano}`;
}

export function formatMonthShort(mes: string): string {
  const [ano, mm] = mes.split("-");
  return `${MESES_PT[Number(mm) - 1].slice(0, 3)}/${ano.slice(2)}`;
}

export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
