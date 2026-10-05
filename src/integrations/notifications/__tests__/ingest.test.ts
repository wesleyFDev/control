jest.mock('@op-engineering/op-sqlite', () =>
  require('../../../db/testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db } from '../../../db/client';
import migrations from '../../../db/migrations/migrations';
import {
  listNotificationCaptures,
  saveNotificationCaptures,
} from '../../../db/repositories/notificationsRepository';
import { ensureSeedData } from '../../../db/seed';
import { refreshCategoryRegistry } from '../../../db/repositories/categoriesRepository';
import { toCaptureRow } from '../ingestNotifications';

const NOW = '2026-10-02T12:00:00.000Z';

const purchase = {
  packageName: 'com.nu.production',
  key: '0|com.nu.production|1|null|10123',
  postedAt: new Date(2026, 9, 2, 9, 30).getTime(),
  title: 'Compra aprovada',
  text: 'Compra de R$ 87,50 APROVADA em SUPERMERCADO BOM PRECO.',
};

describe('notificações de banco no banco local', () => {
  beforeAll(async () => {
    await migrate(db, migrations);
    await ensureSeedData();
    await refreshCategoryRegistry();
  });

  it('interpreta e guarda a notificação, sem duplicar ao receber de novo', async () => {
    const row = toCaptureRow(purchase, NOW);
    expect(row).toMatchObject({
      date: '2026-10-02',
      amountCents: 8750,
      merchant: 'SUPERMERCADO BOM PRECO',
      categoryId: 'mercado',
      isExpenseCandidate: true,
    });

    await saveNotificationCaptures([row]);
    await saveNotificationCaptures([toCaptureRow(purchase, NOW)]);

    const saved = await listNotificationCaptures();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ amountCents: 8750, expenseId: null });
  });

  it('guarda também as ignoradas, com o motivo', async () => {
    await saveNotificationCaptures([
      toCaptureRow(
        {
          ...purchase,
          key: 'outra',
          title: 'Pix recebido',
          text: 'Você recebeu R$ 200,00 de João.',
        },
        NOW,
      ),
    ]);
    const saved = await listNotificationCaptures();
    expect(saved.find(c => c.title === 'Pix recebido')).toMatchObject({
      isExpenseCandidate: false,
      ignoreReason: 'Entrada de dinheiro',
      amountCents: 20000,
    });
  });
});
