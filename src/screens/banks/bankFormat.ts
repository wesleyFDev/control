import type { PluggyItemRow } from '../../db/pluggySchema';

/** Nome do banco, ou o começo do itemId quando a Pluggy não informou. */
export function bankName(item: PluggyItemRow): string {
  return item.name ?? `Banco ${item.id.slice(0, 8)}`;
}

/** "05/10/2026 às 14:32", ou "nunca". */
export function formatMoment(iso: string | null): string {
  if (!iso) {
    return 'nunca';
  }
  const date = new Date(iso);
  return `${date.toLocaleDateString('pt-BR')} às ${date
    .toLocaleTimeString('pt-BR')
    .slice(0, 5)}`;
}

/** "AAAA-MM-DD" para "DD/MM". */
export function shortDay(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export const isCreditAccount = (type: string) => type === 'CREDIT';
