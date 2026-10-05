jest.mock('@op-engineering/op-sqlite', () =>
  require('../testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db, sqlite } from '../client';
import migrations from '../migrations/migrations';
import {
  BillsValidationError,
  createCard,
  createPayable,
  deleteCard,
  deletePayable,
  listBoletoInstallments,
  listInvoiceItems,
  listInvoices,
  listPendingByMonth,
  payBoletoInstallment,
  payInvoice,
} from '../repositories/billsRepository';
import { listExpenses } from '../repositories/expensesRepository';
import { getSelfMemberId } from '../repositories/lookupsRepository';
import { ensureSeedData } from '../seed';

let cardId = '';
let selfId = '';

beforeAll(async () => {
  await migrate(db, migrations);
  await ensureSeedData();
  selfId = (await getSelfMemberId()) ?? '';
  cardId = await createCard({ name: 'Nubank', closingDay: 3, dueDay: 10 });
});

const purchase = {
  kind: 'card' as const,
  categoryId: 'casa',
  scope: 'family' as const,
  memberId: null,
  startDate: '2026-10-02',
};

describe('cartão de crédito', () => {
  it('compras em 3x e 4x geram 4 faturas de valores diferentes, sem criar gastos', async () => {
    await createPayable({
      ...purchase,
      cardId,
      description: 'TV',
      totalCents: 90000,
      installmentsCount: 3,
    });
    await createPayable({
      ...purchase,
      cardId,
      description: 'Sofá',
      totalCents: 40000,
      installmentsCount: 4,
    });

    const invoices = await listInvoices(cardId);
    expect(invoices.map(i => [i.referenceMonth, i.totalCents, i.paid])).toEqual(
      [
        ['2026-10', 40000, false],
        ['2026-11', 40000, false],
        ['2026-12', 40000, false],
        ['2027-01', 10000, false],
      ],
    );
    expect(await listExpenses()).toHaveLength(0);
  });

  it('pagar a fatura paga tudo junto e cria um gasto por parcela', async () => {
    const paid = await payInvoice(cardId, '2026-10', '2026-10-09');
    expect(paid).toBe(2);

    const expenses = await listExpenses();
    expect(
      expenses.map(e => [e.description, e.amountCents, e.date]).sort(),
    ).toEqual([
      ['Sofá (1/4)', 10000, '2026-10-09'],
      ['TV (1/3)', 30000, '2026-10-09'],
    ]);
    const [october] = await listInvoices(cardId);
    expect(october).toMatchObject({ paid: true, paidCents: 40000 });
  });

  it('pagar de novo a mesma fatura não duplica gastos', async () => {
    expect(await payInvoice(cardId, '2026-10')).toBe(0);
    expect(await listExpenses()).toHaveLength(2);
  });

  it('adiantar é pagar uma fatura futura', async () => {
    await payInvoice(cardId, '2027-01', '2026-10-15');
    const items = await listInvoiceItems(cardId, '2027-01');
    expect(items).toEqual([
      expect.objectContaining({
        description: 'Sofá',
        number: 4,
        paidAt: expect.any(String),
      }),
    ]);
    const pending = await listPendingByMonth();
    expect(pending.map(p => p.referenceMonth)).toEqual(['2026-11', '2026-12']);
  });

  it('não deixa apagar cartão com parcelas a pagar', async () => {
    await expect(deleteCard(cardId)).rejects.toBeInstanceOf(
      BillsValidationError,
    );
  });

  it('valida o cartão', async () => {
    await expect(
      createCard({ name: 'X', closingDay: 0, dueDay: 10 }),
    ).rejects.toThrow('fechamento');
  });
});

describe('boletos', () => {
  it('boleto parcelado é pago uma parcela por vez, separado do cartão', async () => {
    const id = await createPayable({
      kind: 'boleto',
      cardId: null,
      description: 'Curso',
      categoryId: 'outros',
      scope: 'personal',
      memberId: selfId,
      totalCents: 30000,
      installmentsCount: 3,
      startDate: '2026-11-20',
    });

    const boletos = (await listBoletoInstallments()).filter(
      b => b.payableId === id,
    );
    expect(boletos.map(b => [b.number, b.dueDate, b.amountCents])).toEqual([
      [1, '2026-11-20', 10000],
      [2, '2026-12-20', 10000],
      [3, '2027-01-20', 10000],
    ]);

    await payBoletoInstallment(boletos[1].id, '2026-11-01');
    const expense = (await listExpenses()).find(
      e => e.description === 'Curso (2/3)',
    );
    expect(expense).toMatchObject({
      scope: 'personal',
      memberId: selfId,
      amountCents: 10000,
    });
    // As outras parcelas continuam a pagar.
    const after = (await listBoletoInstallments()).filter(
      b => b.payableId === id,
    );
    expect(after.map(b => Boolean(b.paidAt))).toEqual([false, true, false]);
  });

  it('apagar o boleto tira as parcelas a pagar e mantém a já paga como gasto', async () => {
    const [curso] = (await listBoletoInstallments()).filter(
      b => b.description === 'Curso',
    );
    await deletePayable(curso.payableId);
    expect(
      (await listBoletoInstallments()).filter(b => b.description === 'Curso'),
    ).toHaveLength(0);
    expect(
      (await listExpenses()).some(e => e.description === 'Curso (2/3)'),
    ).toBe(true);
    const remaining = sqlite.executeSync(
      'SELECT COUNT(*) AS c FROM payable_installments WHERE paid_at IS NOT NULL AND deleted_at IS NULL AND payable_id = ?',
      [curso.payableId] as never,
    );
    expect(remaining.rows[0]?.c).toBe(1);
  });
});
