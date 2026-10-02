import type { ExpenseListItem } from '../../../db/repositories/expensesRepository';
import {
  filterExpenses,
  isFuturePeriod,
  periodLabel,
  periodRange,
  shiftPeriod,
  summarize,
  totalsByCategory,
  totalsOverTime,
  type Period,
} from '../report';

const NOW = new Date(2026, 9, 2, 10, 0, 0); // 2 de outubro de 2026

function item(partial: Partial<ExpenseListItem>): ExpenseListItem {
  return {
    id: Math.random().toString(),
    amountCents: 1000,
    date: '2026-10-01',
    scope: 'family',
    description: null,
    categoryId: 'mercado',
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    memberId: null,
    memberName: null,
    ...partial,
  };
}

const MONTH: Period = { mode: 'month', anchor: '2026-09-15' };
const YEAR: Period = { mode: 'year', anchor: '2026-09-15' };

describe('período', () => {
  it('calcula o intervalo do mês e do ano', () => {
    expect(periodRange(MONTH)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(periodRange({ mode: 'month', anchor: '2024-02-10' }).to).toBe(
      '2024-02-29',
    );
    expect(periodRange(YEAR)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('mostra o nome e navega entre períodos', () => {
    expect(periodLabel(MONTH)).toBe('Setembro 2026');
    expect(periodLabel(YEAR)).toBe('2026');
    expect(periodLabel(shiftPeriod(MONTH, 1))).toBe('Outubro 2026');
    expect(
      periodLabel(shiftPeriod({ mode: 'month', anchor: '2026-01-31' }, -1)),
    ).toBe('Dezembro 2025');
    expect(periodLabel(shiftPeriod(YEAR, -1))).toBe('2025');
  });

  it('identifica períodos que ainda não começaram', () => {
    expect(isFuturePeriod({ mode: 'month', anchor: '2026-10-01' }, NOW)).toBe(
      false,
    );
    expect(isFuturePeriod({ mode: 'month', anchor: '2026-11-01' }, NOW)).toBe(
      true,
    );
  });
});

describe('filtros', () => {
  const items = [
    item({ scope: 'family', categoryId: 'mercado' }),
    item({ scope: 'personal', memberId: 'eu', categoryId: 'lazer' }),
    item({ scope: 'personal', memberId: 'ana', categoryId: 'lazer' }),
  ];

  it('"Meus" mostra só os gastos pessoais seus', () => {
    const mine = filterExpenses(items, {
      tab: 'me',
      selfMemberId: 'eu',
      categoryIds: [],
    });
    expect(mine).toHaveLength(1);
    expect(mine[0].memberId).toBe('eu');
  });

  it('"Família" mostra os gastos da família', () => {
    const family = filterExpenses(items, {
      tab: 'family',
      selfMemberId: 'eu',
      categoryIds: [],
    });
    expect(family.map(i => i.scope)).toEqual(['family']);
  });

  it('filtra pelas categorias escolhidas', () => {
    expect(
      filterExpenses(items, {
        tab: 'family',
        selfMemberId: 'eu',
        categoryIds: ['lazer'],
      }),
    ).toHaveLength(0);
  });
});

describe('totais', () => {
  const items = [
    item({ amountCents: 6000, categoryId: 'mercado', date: '2026-09-02' }),
    item({ amountCents: 3000, categoryId: 'mercado', date: '2026-09-02' }),
    item({
      amountCents: 1000,
      categoryId: 'lazer',
      categoryName: 'Lazer',
      date: '2026-09-20',
    }),
  ];

  it('soma por categoria, da maior para a menor, com a fatia de cada uma', () => {
    const totals = totalsByCategory(items);
    expect(totals.map(t => [t.categoryId, t.totalCents, t.count])).toEqual([
      ['mercado', 9000, 2],
      ['lazer', 1000, 1],
    ]);
    expect(totals[0].share).toBeCloseTo(0.9);
  });

  it('monta um ponto por dia no mês, inclusive os dias sem gasto', () => {
    const buckets = totalsOverTime(items, MONTH);
    expect(buckets).toHaveLength(30);
    expect(buckets[1]).toMatchObject({ label: '2', totalCents: 9000 });
    expect(buckets[19].totalCents).toBe(1000);
    expect(buckets[0].totalCents).toBe(0);
  });

  it('monta um ponto por mês no ano', () => {
    const buckets = totalsOverTime(items, YEAR);
    expect(buckets).toHaveLength(12);
    expect(buckets[8]).toMatchObject({ label: 'set', totalCents: 10000 });
  });

  it('calcula a média por dia só com os dias já passados', () => {
    // Setembro inteiro já passou: 30 dias.
    expect(summarize(items, MONTH, NOW)).toEqual({
      totalCents: 10000,
      count: 3,
      dailyAverageCents: 333,
    });
    // Em 2 de outubro, o mês corrente tem só 2 dias.
    const october = [item({ amountCents: 1000, date: '2026-10-01' })];
    expect(
      summarize(october, { mode: 'month', anchor: '2026-10-01' }, NOW)
        .dailyAverageCents,
    ).toBe(500);
  });
});
