import type { PluggyAccount, PluggyTransaction } from './pluggyClient';

export type TransactionVerdict =
  | { expense: true; amountCents: number }
  | { expense: false; reason: string };

/** Operações de cartão que não são compra. */
const CARD_NOT_EXPENSE = new Set(['PAGAMENTO_FATURA', 'ESTORNO', 'CASHBACK']);

/**
 * Operações de conta que não viram gasto: dinheiro guardado ou movido
 * entre contas suas. O pagamento da fatura também sai daqui, porque as
 * compras do cartão já entram como gastos.
 */
const BANK_NOT_EXPENSE = new Set([
  'TRANSFERENCIA_MESMA_INSTITUICAO',
  'RESGATE_APLIC_FINANCEIRA',
  'RENDIMENTO_APLIC_FINANCEIRA',
  'PORTABILIDADE_SALARIO',
]);

const BILL_PAYMENT_TEXT =
  /pagamento\s+(de\s+)?fatura|pagto\s+fatura|fatura\s+cart/i;

/**
 * Decide se uma transação da Pluggy seria importada como gasto.
 * Só serve para a prévia por enquanto: nada é gravado.
 *
 * Convenções da Pluggy:
 * - Conta (BANK): `type` DEBIT é saída, CREDIT é entrada.
 * - Cartão (CREDIT): valor positivo é compra; negativo é pagamento ou estorno.
 */
export function classifyTransaction(
  transaction: PluggyTransaction,
  account: PluggyAccount,
): TransactionVerdict {
  const amountCents = Math.round(Math.abs(transaction.amount) * 100);
  const operation = transaction.operationType ?? '';

  if (account.type === 'CREDIT') {
    if (transaction.amount <= 0) {
      return { expense: false, reason: 'Pagamento ou crédito no cartão' };
    }
    if (CARD_NOT_EXPENSE.has(operation)) {
      return { expense: false, reason: `Operação ${operation}` };
    }
    return { expense: true, amountCents };
  }

  if (transaction.type === 'CREDIT') {
    return { expense: false, reason: 'Entrada de dinheiro' };
  }
  if (BANK_NOT_EXPENSE.has(operation)) {
    return { expense: false, reason: `Operação ${operation}` };
  }
  if (BILL_PAYMENT_TEXT.test(transaction.description)) {
    return {
      expense: false,
      reason: 'Pagamento de fatura: as compras do cartão já contam',
    };
  }
  return { expense: true, amountCents };
}
