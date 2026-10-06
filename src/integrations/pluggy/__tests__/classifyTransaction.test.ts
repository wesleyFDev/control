import { classifyTransaction } from '../classifyTransaction';
import type { PluggyAccount, PluggyTransaction } from '../pluggyTypes';

describe('classifyTransaction', () => {
  const bank = { type: 'BANK' } as PluggyAccount;
  const card = { type: 'CREDIT' } as PluggyAccount;
  const tx = (partial: Partial<PluggyTransaction>) =>
    ({
      id: 't',
      description: 'Compra',
      amount: 10,
      type: 'DEBIT',
      operationType: null,
      ...partial,
    } as PluggyTransaction);

  it('compra no cartão vira gasto, com o valor em centavos', () => {
    expect(classifyTransaction(tx({ amount: 87.5 }), card)).toEqual({
      expense: true,
      amountCents: 8750,
    });
  });

  it('pagamento e estorno no cartão não viram gasto', () => {
    expect(classifyTransaction(tx({ amount: -500 }), card).expense).toBe(false);
    expect(
      classifyTransaction(tx({ amount: 30, operationType: 'ESTORNO' }), card)
        .expense,
    ).toBe(false);
  });

  it('saída da conta vira gasto e entrada não', () => {
    expect(
      classifyTransaction(tx({ amount: -45, operationType: 'PIX' }), bank),
    ).toEqual({ expense: true, amountCents: 4500 });
    expect(
      classifyTransaction(tx({ type: 'CREDIT', amount: 3000 }), bank).expense,
    ).toBe(false);
  });

  it('pagamento da fatura e transferência entre contas suas não viram gasto', () => {
    expect(
      classifyTransaction(
        tx({ amount: -900, description: 'PAGAMENTO DE FATURA' }),
        bank,
      ).expense,
    ).toBe(false);
    expect(
      classifyTransaction(
        tx({ amount: -100, operationType: 'TRANSFERENCIA_MESMA_INSTITUICAO' }),
        bank,
      ).expense,
    ).toBe(false);
  });
});
