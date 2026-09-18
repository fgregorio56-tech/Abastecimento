const PLACA_ANTIGA = /^[A-Z]{3}[0-9]{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizePlaca(raw: string): string {
  const clean = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
  // Algumas planilhas trazem marca/modelo grudados com a placa no mesmo
  // campo (ex.: "MERCEDES BBF5J37"). A placa real (7 caracteres) fica
  // sempre no final do texto.
  return clean.length > 7 ? clean.slice(-7) : clean;
}

export function isPlacaValida(raw: string): boolean {
  const placa = normalizePlaca(raw);
  return PLACA_ANTIGA.test(placa) || PLACA_MERCOSUL.test(placa);
}

export function formatPlaca(raw: string): string {
  const placa = normalizePlaca(raw);
  if (PLACA_ANTIGA.test(placa)) {
    return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  }
  return placa;
}
