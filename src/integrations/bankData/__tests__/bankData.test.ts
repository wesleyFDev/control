jest.mock('@op-engineering/op-sqlite', () =>
  require('../../../db/testing/fakeOpSqlite'),
);
jest.mock('../../../backend/supabase', () => ({
  invokeFunction: (...args: unknown[]) => mockInvoke(...args),
}));

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db } from '../../../db/client';
import migrations from '../../../db/migrations/migrations';
import { listExpenses } from '../../../db/repositories/expensesRepository';
import { getSelfMemberId } from '../../../db/repositories/lookupsRepository';
import {
  getBank,
  listBankTransactions,
  transferToExpenses,
  undoTransfer,
} from '../../../db/repositories/pluggyRepository';
import { ensureSeedData } from '../../../db/seed';
import { syncBankData } from '../syncBankData';

const mockInvoke = jest.fn();

const backendResponse = {
  items: [
    {
      id: 'item-1',
      connectorName: 'Santander',
      lastUpdatedAt: '2026-10-05T09:00:00.000Z',
      accounts: [
        {
          id: 'conta-1',
          itemId: 'item-1',
          name: 'Conta Corrente',
          type: 'BANK',
          subtype: 'CHECKING_ACCOUNT',
          number: '0001',
          balance: 1520.35,
          currencyCode: 'BRL',
        },
        {
          id: 'cartao-1',
          itemId: 'item-1',
          name: 'Cartão',
          type: 'CREDIT',
          subtype: 'CREDIT_CARD',
          number: '1234',
          balance: 800,
          currencyCode: 'BRL',
          creditData: {
            creditLimit: 5000,
            availableCreditLimit: 4200,
            balanceCloseDate: '2026-10-25T12:00:00.000Z',
            balanceDueDate: '2026-11-02T12:00:00.000Z',
          },
        },
      ],
      transactions: [
        {
          id: 't-mercado',
          accountId: 'conta-1',
          date: '2026-10-03T15:00:00.000Z',
          description: 'Supermercado Dia',
          amount: -87.5,
          currencyCode: 'BRL',
          type: 'DEBIT',
          status: 'POSTED',
        },
        {
          id: 't-salario',
          accountId: 'conta-1',
          date: '2026-10-01T15:00:00.000Z',
          description: 'Salário',
          amount: 4000,
          currencyCode: 'BRL',
          type: 'CREDIT',
          status: 'POSTED',
        },
        {
          id: 't-cartao',
          accountId: 'cartao-1',
          date: '2026-10-04T15:00:00.000Z',
          description: 'Restaurante',
          amount: 120,
          currencyCode: 'BRL',
          type: 'DEBIT',
          status: 'PENDING',
        },
      ],
    },
  ],
};

beforeAll(async () => {
  await migrate(db, migrations);
  await ensureSeedData();
  mockInvoke.mockImplementation(() => Promise.resolve(backendResponse));
});

describe('dados dos bancos pelo backend', () => {
  it('chama a Edge Function e grava banco, saldo, limite e transações', async () => {
    const result = await syncBankData();

    expect(result).toEqual({ items: 1, transactions: 3, errors: [] });
    expect(mockInvoke).toHaveBeenCalledWith('bank-data', {
      body: { items: [] },
    });

    const bank = await getBank('item-1');
    expect(bank?.item.name).toBe('Santander');
    expect(bank?.item.bankUpdatedAt).toBe('2026-10-05T09:00:00.000Z');
    expect(bank?.item.lastSyncedAt).not.toBeNull();

    const conta = bank?.accounts.find(a => a.id === 'conta-1');
    const cartao = bank?.accounts.find(a => a.id === 'cartao-1');
    expect(conta?.balanceCents).toBe(152035);
    expect(cartao).toMatchObject({
      creditLimitCents: 500000,
      availableCreditLimitCents: 420000,
      balanceDueDate: '2026-11-02',
    });
  });

  it('na segunda vez pede só a partir da última sincronização', async () => {
    mockInvoke.mockClear();
    await syncBankData();
    const { body } = mockInvoke.mock.calls[0][1];
    expect(body.items).toEqual([
      { id: 'item-1', from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
    ]);
  });

  it('separa as transações a passar das ignoradas', async () => {
    const pending = await listBankTransactions('conta-1', 'pending');
    const ignored = await listBankTransactions('conta-1', 'ignored');
    expect(pending.map(t => t.id)).toEqual(['t-mercado']);
    expect(ignored.map(t => t.id)).toEqual(['t-salario']);
  });

  it('passa para os gastos como meu, sem duplicar, e desfaz', async () => {
    const selfId = await getSelfMemberId();
    const choice = {
      transactionId: 't-mercado',
      categoryId: 'mercado',
      description: 'Compras do mês',
    };

    expect(
      await transferToExpenses([choice], {
        scope: 'personal',
        memberId: selfId,
      }),
    ).toBe(1);
    // A mesma transação de novo não cria outro gasto.
    expect(
      await transferToExpenses([choice], { scope: 'family', memberId: null }),
    ).toBe(0);

    const expense = (await listExpenses()).find(
      e => e.description === 'Compras do mês',
    );
    expect(expense).toMatchObject({
      amountCents: 8750,
      date: '2026-10-03',
      scope: 'personal',
      memberId: selfId,
      categoryId: 'mercado',
    });
    expect(
      (await listBankTransactions('conta-1', 'transferred')).map(t => t.id),
    ).toEqual(['t-mercado']);

    await undoTransfer('t-mercado');
    expect(
      (await listExpenses()).some(e => e.description === 'Compras do mês'),
    ).toBe(false);
    expect(
      (await listBankTransactions('conta-1', 'pending')).map(t => t.id),
    ).toEqual(['t-mercado']);
  });

  it('passa compra do cartão como gasto da família', async () => {
    expect(
      await transferToExpenses(
        [
          {
            transactionId: 't-cartao',
            categoryId: 'restaurantes',
            description: '',
          },
        ],
        { scope: 'family', memberId: null },
      ),
    ).toBe(1);
    const expense = (await listExpenses()).find(
      e => e.description === 'Restaurante',
    );
    expect(expense).toMatchObject({
      amountCents: 12000,
      scope: 'family',
      memberId: null,
    });
  });

  it('banco removido na nuvem sai da tela', async () => {
    mockInvoke.mockImplementationOnce(() => Promise.resolve({ items: [] }));
    await syncBankData();
    expect(await getBank('item-1')).toBeNull();
    // Volta quando a nuvem devolve de novo.
    await syncBankData();
    expect(await getBank('item-1')).not.toBeNull();
  });

  it('gasto pessoal sem membro é recusado', async () => {
    await expect(
      transferToExpenses(
        [{ transactionId: 't-salario', categoryId: 'outros', description: '' }],
        { scope: 'personal', memberId: null },
      ),
    ).rejects.toThrow('Escolha de quem é o gasto');
  });
});
