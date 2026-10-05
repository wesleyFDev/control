jest.mock('@op-engineering/op-sqlite', () =>
  require('../../../db/testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db, sqlite } from '../../../db/client';
import migrations from '../../../db/migrations/migrations';
import {
  addPluggyItem,
  listPluggyAccounts,
  listPluggyItems,
  listPluggyTransactions,
  removePluggyItem,
} from '../../../db/repositories/pluggyRepository';
import { ensureSeedData } from '../../../db/seed';
import { saveCredentials } from '../credentialsStore';
import { syncPluggy } from '../syncPluggy';

const mockFetch = jest.fn();
(globalThis as { fetch: unknown }).fetch = mockFetch;

let mockTransactions: unknown[] = [];

function respond(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 300,
    status,
    statusText: 'x',
    json: () => Promise.resolve(body),
  });
}

beforeAll(async () => {
  await migrate(db, migrations);
  await ensureSeedData();
});

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (url.endsWith('/auth')) {
      return respond({ apiKey: 'chave' });
    }
    if (url.includes('/accounts?itemId=item-ok')) {
      return respond({
        results: [
          {
            id: 'card-1',
            name: 'Cartão Nubank',
            type: 'CREDIT',
            subtype: 'CREDIT_CARD',
            number: '1234',
            balance: 350.4,
            currencyCode: 'BRL',
          },
        ],
      });
    }
    if (url.includes('/accounts?itemId=item-ruim')) {
      return respond({ message: 'not found' }, 404);
    }
    if (url.includes('/transactions')) {
      return respond({ totalPages: 1, page: 1, results: mockTransactions });
    }
    return respond({}, 500);
  });
});

describe('sincronização com a Pluggy', () => {
  it('exige credenciais salvas', async () => {
    await expect(syncPluggy()).rejects.toThrow('Salve o Client ID');
  });

  it('grava contas e transações nas tabelas da Pluggy, sem criar gastos', async () => {
    await saveCredentials({ clientId: 'id', clientSecret: 'segredo' });
    await addPluggyItem('item-ok');
    await addPluggyItem('item-ruim');
    mockTransactions = [
      {
        id: 'tx-1',
        date: '2026-09-30T03:00:00.000Z',
        description: 'IFOOD',
        amount: 45.9,
        currencyCode: 'BRL',
        type: 'DEBIT',
        status: 'PENDING',
        operationType: null,
      },
      {
        id: 'tx-2',
        date: '2026-09-10T03:00:00.000Z',
        description: 'Pagamento recebido',
        amount: -900,
        currencyCode: 'BRL',
        type: 'CREDIT',
        status: 'POSTED',
        operationType: 'PAGAMENTO_FATURA',
      },
    ];

    const result = await syncPluggy();
    expect(result).toMatchObject({ items: 1, accounts: 1, transactions: 2 });
    expect(result.errors).toEqual([
      expect.objectContaining({ itemId: 'item-ruim' }),
    ]);

    const accounts = await listPluggyAccounts();
    expect(accounts).toEqual([
      expect.objectContaining({
        id: 'card-1',
        balanceCents: 35040,
        transactionCount: 2,
        candidateCount: 1,
      }),
    ]);

    const transactions = await listPluggyTransactions('card-1');
    expect(
      transactions.map(t => [t.id, t.amountCents, t.isExpenseCandidate]),
    ).toEqual([
      ['tx-1', 4590, true],
      ['tx-2', -90000, false],
    ]);

    const items = await listPluggyItems();
    expect(items.find(i => i.id === 'item-ok')?.lastSyncedAt).toBeTruthy();
    expect(items.find(i => i.id === 'item-ruim')?.lastError).toContain('404');

    const expenses = sqlite.executeSync('SELECT COUNT(*) AS c FROM expenses');
    expect(expenses.rows[0]?.c).toBe(0);
  });

  it('sincronizar de novo atualiza a transação sem duplicar e mantém a ligação com o gasto', async () => {
    sqlite.executeSync(
      "INSERT INTO expenses (id, amount_cents, category_id, date, scope, member_id, source, created_at, updated_at) VALUES ('g1', 4590, 'restaurantes', '2026-09-30', 'family', NULL, 'manual', 'x', 'x')",
    );
    sqlite.executeSync(
      "UPDATE pluggy_transactions SET expense_id = 'g1' WHERE id = 'tx-1'",
    );
    mockTransactions = [
      {
        id: 'tx-1',
        date: '2026-09-30T03:00:00.000Z',
        description: 'IFOOD *RESTAURANTE',
        amount: 45.9,
        currencyCode: 'BRL',
        type: 'DEBIT',
        status: 'POSTED',
        operationType: null,
      },
    ];

    await syncPluggy();
    const transactions = await listPluggyTransactions('card-1');
    expect(transactions).toHaveLength(2);
    expect(transactions.find(t => t.id === 'tx-1')).toMatchObject({
      status: 'POSTED',
      description: 'IFOOD *RESTAURANTE',
      expenseId: 'g1',
    });
  });

  it('item removido sai da sincronização, mas os dados continuam', async () => {
    await removePluggyItem('item-ruim');
    const result = await syncPluggy();
    expect(result.errors).toEqual([]);
    await removePluggyItem('item-ok');
    expect(await listPluggyItems()).toEqual([]);
    expect(await listPluggyTransactions('card-1')).toHaveLength(2);
  });
});
