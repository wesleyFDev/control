import type {
  NewPluggyAccount,
  NewPluggyTransaction,
} from '../../db/repositories/pluggyRepository';
import { toISODate } from '../../utils/dates';
import { classifyTransaction } from './classifyTransaction';
import type { PluggyAccount, PluggyTransaction } from './pluggyTypes';

/** Converte as respostas da Pluggy nas linhas das tabelas locais. */

export function toCents(value: number): number {
  return Math.round(value * 100);
}

function optionalCents(value: number | null | undefined): number | null {
  return typeof value === 'number' ? toCents(value) : null;
}

/** A Pluggy manda datas em UTC; o dia que importa é o local. */
function optionalDay(value: string | null | undefined): string | null {
  return value ? toISODate(new Date(value)) : null;
}

export function toAccountRow(
  account: PluggyAccount,
  itemId: string,
): NewPluggyAccount {
  return {
    id: account.id,
    itemId,
    name: account.name,
    marketingName: account.marketingName ?? null,
    type: account.type,
    subtype: account.subtype ?? null,
    number: account.number ?? null,
    balanceCents: toCents(account.balance ?? 0),
    creditLimitCents: optionalCents(account.creditData?.creditLimit),
    availableCreditLimitCents: optionalCents(
      account.creditData?.availableCreditLimit,
    ),
    balanceCloseDate: optionalDay(account.creditData?.balanceCloseDate),
    balanceDueDate: optionalDay(account.creditData?.balanceDueDate),
    currencyCode: account.currencyCode ?? 'BRL',
    rawJson: JSON.stringify(account),
  };
}

export function toTransactionRow(
  transaction: PluggyTransaction,
  account: PluggyAccount,
): NewPluggyTransaction {
  const verdict = classifyTransaction(transaction, account);
  return {
    id: transaction.id,
    accountId: account.id,
    date: toISODate(new Date(transaction.date)),
    postedAt: transaction.date,
    description: transaction.description,
    amountCents: toCents(transaction.amount),
    currencyCode: transaction.currencyCode ?? 'BRL',
    type: transaction.type,
    status: transaction.status,
    operationType: transaction.operationType ?? null,
    category: transaction.category ?? null,
    installmentNumber:
      transaction.creditCardMetadata?.installmentNumber ?? null,
    totalInstallments:
      transaction.creditCardMetadata?.totalInstallments ?? null,
    isExpenseCandidate: verdict.expense,
    ignoreReason: verdict.expense ? null : verdict.reason,
    rawJson: JSON.stringify(transaction),
  };
}
