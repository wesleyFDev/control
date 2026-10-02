import type { ExpenseListItem } from '../../db/repositories/expensesRepository';
import {
  addDays,
  fromISODate,
  toISODate,
  type ISODate,
} from '../../utils/dates';

/** "Meus": gastos pessoais seus. "Família": gastos da família, que são de todos. */
export type ReportTab = 'me' | 'family';

export type PeriodMode = 'month' | 'year';

export type Period = {
  mode: PeriodMode;
  /** Qualquer dia dentro do mês ou do ano escolhido. */
  anchor: ISODate;
};

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

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

export function periodRange(period: Period): { from: ISODate; to: ISODate } {
  const date = fromISODate(period.anchor);
  if (period.mode === 'year') {
    return {
      from: toISODate(new Date(date.getFullYear(), 0, 1)),
      to: toISODate(new Date(date.getFullYear(), 11, 31)),
    };
  }
  return {
    from: toISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export function periodLabel(period: Period): string {
  const date = fromISODate(period.anchor);
  return period.mode === 'year'
    ? String(date.getFullYear())
    : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Avança (+1) ou volta (-1) um mês ou um ano. */
export function shiftPeriod(period: Period, step: 1 | -1): Period {
  const date = fromISODate(period.anchor);
  const next =
    period.mode === 'year'
      ? new Date(date.getFullYear() + step, 0, 1)
      : new Date(date.getFullYear(), date.getMonth() + step, 1);
  return { ...period, anchor: toISODate(next) };
}

/** Não deixa avançar para um período que ainda não começou. */
export function isFuturePeriod(
  period: Period,
  now: Date = new Date(),
): boolean {
  return periodRange(period).from > toISODate(now);
}

export type ReportFilters = {
  tab: ReportTab;
  selfMemberId: string | null;
  /** Vazio quer dizer todas as categorias. */
  categoryIds: string[];
};

export function filterExpenses(
  items: ExpenseListItem[],
  { tab, selfMemberId, categoryIds }: ReportFilters,
): ExpenseListItem[] {
  return items.filter(item => {
    const inTab =
      tab === 'family'
        ? item.scope === 'family'
        : item.scope === 'personal' && item.memberId === selfMemberId;
    const inCategory =
      categoryIds.length === 0 || categoryIds.includes(item.categoryId);
    return inTab && inCategory;
  });
}

export type CategoryTotal = {
  categoryId: string;
  name: string;
  icon: string;
  totalCents: number;
  count: number;
  /** Fatia do total do período, de 0 a 1. */
  share: number;
};

export function totalsByCategory(items: ExpenseListItem[]): CategoryTotal[] {
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  const map = new Map<string, CategoryTotal>();
  for (const item of items) {
    const current = map.get(item.categoryId) ?? {
      categoryId: item.categoryId,
      name: item.categoryName,
      icon: item.categoryIcon,
      totalCents: 0,
      count: 0,
      share: 0,
    };
    current.totalCents += item.amountCents;
    current.count += 1;
    map.set(item.categoryId, current);
  }
  return [...map.values()]
    .map(c => ({ ...c, share: total > 0 ? c.totalCents / total : 0 }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export type TimeBucket = {
  key: string;
  label: string;
  totalCents: number;
};

/**
 * Pontos do gráfico de barras: um por dia no modo mês e um por mês no modo
 * ano. Dias e meses sem gasto aparecem com zero, para o eixo não ter buracos.
 */
export function totalsOverTime(
  items: ExpenseListItem[],
  period: Period,
): TimeBucket[] {
  const { from, to } = periodRange(period);
  const buckets: TimeBucket[] = [];

  if (period.mode === 'year') {
    const year = fromISODate(from).getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      buckets.push({ key, label: MONTHS_SHORT[month], totalCents: 0 });
    }
  } else {
    for (
      let day = fromISODate(from);
      toISODate(day) <= to;
      day = addDays(day, 1)
    ) {
      buckets.push({
        key: toISODate(day),
        label: String(day.getDate()),
        totalCents: 0,
      });
    }
  }

  const index = new Map(buckets.map((bucket, i) => [bucket.key, i]));
  for (const item of items) {
    const key = period.mode === 'year' ? item.date.slice(0, 7) : item.date;
    const position = index.get(key);
    if (position !== undefined) {
      buckets[position].totalCents += item.amountCents;
    }
  }
  return buckets;
}

export type ReportSummary = {
  totalCents: number;
  count: number;
  /** Média por dia, contando os dias já passados do período. */
  dailyAverageCents: number;
};

export function summarize(
  items: ExpenseListItem[],
  period: Period,
  now: Date = new Date(),
): ReportSummary {
  const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
  const { from, to } = periodRange(period);
  const today = toISODate(now);
  const lastDay = to < today ? to : today;
  const days =
    lastDay < from
      ? 0
      : Math.round(
          (fromISODate(lastDay).getTime() - fromISODate(from).getTime()) /
            86400000,
        ) + 1;
  return {
    totalCents,
    count: items.length,
    dailyAverageCents: days > 0 ? Math.round(totalCents / days) : 0,
  };
}
