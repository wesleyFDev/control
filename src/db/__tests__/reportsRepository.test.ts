jest.mock('@op-engineering/op-sqlite', () =>
  require('../testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db } from '../client';
import migrations from '../migrations/migrations';
import {
  createExpense,
  deleteExpense,
} from '../repositories/expensesRepository';
import { listExpensesBetween } from '../repositories/reportsRepository';
import { ensureSeedData } from '../seed';

describe('listExpensesBetween', () => {
  beforeAll(async () => {
    await migrate(db, migrations);
    await ensureSeedData();
  });

  it('traz só os gastos do intervalo, inclusive as pontas, sem os apagados', async () => {
    const base = {
      categoryId: 'mercado',
      scope: 'family' as const,
      memberId: null,
      description: null,
      source: 'manual' as const,
      rawText: null,
    };
    await createExpense({ ...base, amountCents: 100, date: '2026-08-31' });
    await createExpense({ ...base, amountCents: 200, date: '2026-09-01' });
    await createExpense({ ...base, amountCents: 300, date: '2026-09-30' });
    const deleted = await createExpense({
      ...base,
      amountCents: 400,
      date: '2026-09-15',
    });
    await deleteExpense(deleted);
    await createExpense({ ...base, amountCents: 500, date: '2026-10-01' });

    const rows = await listExpensesBetween('2026-09-01', '2026-09-30');
    expect(rows.map(r => r.amountCents)).toEqual([200, 300]);
    expect(rows[0]).toMatchObject({ categoryName: 'Mercado', scope: 'family' });
  });
});
