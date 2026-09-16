const PLACA_ANTIGA = /^[A-Z]{3}[0-9]{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizePlaca(raw: string): string {
  return raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
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
