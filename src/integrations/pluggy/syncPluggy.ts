import { aiLog as log } from '../../ai/aiLog';
import {
  listPluggyItems,
  markItemSynced,
  upsertPluggyAccounts,
  upsertPluggyTransactions,
  type NewPluggyTransaction,
} from '../../db/repositories/pluggyRepository';
import { addDays, toISODate } from '../../utils/dates';
import { classifyTransaction } from './classifyTransaction';
import { loadCredentials } from './credentialsStore';
import {
  createApiKey,
  listAccounts,
  listTransactions,
  type PluggyAccount,
  type PluggyTransaction,
} from './pluggyClient';

/** Na primeira sincronização de um item, busca até 12 meses, o máximo da Pluggy. */
const FIRST_SYNC_DAYS = 365;
/**
 * Nas seguintes, volta alguns dias antes da última sincronização: transações
 * pendentes mudam até serem lançadas, e o banco pode publicar com atraso.
 */
const OVERLAP_DAYS = 10;

export type SyncResult = {
  items: number;
  accounts: number;
  transactions: number;
  errors: { itemId: string; message: string }[];
};

export type SyncProgress = (message: string) => void;

function toCents(value: number): number {
  return Math.round(value * 100);
}

function toRow(
  transaction: PluggyTransaction,
  account: PluggyAccount,
): NewPluggyTransaction {
  const verdict = classifyTransaction(transaction, account);
  return {
    id: transaction.id,
    accountId: account.id,
    // A Pluggy manda a data em UTC; o dia que importa é o local.
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

/**
 * Baixa contas e transações de todos os itens cadastrados e grava nas
 * tabelas da Pluggy. Não cria gastos: a mesclagem com `expenses` fica para
 * depois. Um item com erro não impede os outros.
 */
export async function syncPluggy(onProgress: SyncProgress = () => undefined) {
  const credentials = await loadCredentials();
  if (!credentials) {
    throw new Error(
      'Salve o Client ID e o Client Secret antes de sincronizar.',
    );
  }
  const items = await listPluggyItems();
  if (items.length === 0) {
    throw new Error('Adicione pelo menos um itemId antes de sincronizar.');
  }

  onProgress('Conectando à Pluggy...');
  const apiKey = await createApiKey(
    credentials.clientId,
    credentials.clientSecret,
  );

  const result: SyncResult = {
    items: 0,
    accounts: 0,
    transactions: 0,
    errors: [],
  };
  const today = new Date();

  for (const item of items) {
    const shortId = item.id.slice(0, 8);
    try {
      onProgress(`Item ${shortId}: buscando as contas...`);
      const accounts = await listAccounts(apiKey, item.id);
      await upsertPluggyAccounts(
        accounts.map(account => ({
          id: account.id,
          itemId: item.id,
          name: account.name,
          marketingName: account.marketingName ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          number: account.number ?? null,
          balanceCents: toCents(account.balance ?? 0),
          currencyCode: account.currencyCode ?? 'BRL',
          rawJson: JSON.stringify(account),
        })),
      );

      const from = item.lastSyncedAt
        ? addDays(new Date(item.lastSyncedAt), -OVERLAP_DAYS)
        : addDays(today, -FIRST_SYNC_DAYS);

      for (const account of accounts) {
        onProgress(`Item ${shortId}: transações de ${account.name}...`);
        const transactions = await listTransactions(
          apiKey,
          account.id,
          toISODate(from),
          toISODate(today),
        );
        await upsertPluggyTransactions(
          transactions.map(t => toRow(t, account)),
        );
        result.transactions += transactions.length;
        log(
          `pluggy: ${account.name} com ${
            transactions.length
          } transação(ões) desde ${toISODate(from)}`,
        );
      }

      await markItemSynced(item.id, null);
      result.items += 1;
      result.accounts += accounts.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markItemSynced(item.id, message);
      result.errors.push({ itemId: item.id, message });
      log(`pluggy: item ${shortId} falhou`, message);
    }
  }

  return result;
}
