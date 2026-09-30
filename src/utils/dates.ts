const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Data local no formato AAAA-MM-DD, sem fuso. */
export type ISODate = string;

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/** "Hoje, 30 set", "Ontem, 29 set" ou "25 set". Mostra o ano se for outro. */
export function formatDayLabel(iso: ISODate, now: Date = new Date()): string {
  const date = fromISODate(iso);
  const base = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  const withYear =
    date.getFullYear() === now.getFullYear()
      ? base
      : `${base} ${date.getFullYear()}`;

  if (iso === toISODate(now)) {
    return `Hoje, ${withYear}`;
  }
  if (iso === toISODate(addDays(now, -1))) {
    return `Ontem, ${withYear}`;
  }
  return withYear;
}
