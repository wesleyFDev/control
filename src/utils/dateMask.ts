import { fromISODate, type ISODate } from './dates';

/**
 * Formata a data enquanto o usuário digita, só com números:
 * "05" → "05", "0509" → "05/09", "05092026" → "05/09/2026".
 * Barras e outros caracteres digitados são ignorados.
 */
export function maskDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "2026-09-05" → "05/09/2026". */
export function isoToBR(iso: ISODate): string {
  const date = fromISODate(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
