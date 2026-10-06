import { aiLog as log } from '../../ai/aiLog';
import {
  listPluggyItems,
  markItemSynced,
  removePluggyItem,
  upsertPluggyAccounts,
  upsertPluggyTransactions,
  upsertBankItem,
} from '../../db/repositories/pluggyRepository';
import { addDays, toISODate } from '../../utils/dates';
import { toAccountRow, toTransactionRow } from '../pluggy/pluggyRows';
import { fetchBankData } from './bankDataApi';

/**
 * Volta alguns dias antes da última sincronização: transações pendentes
 * mudam até serem lançadas, e o banco pode publicar com atraso.
 */
const OVERLAP_DAYS = 10;

export type BankSyncResult = {
  items: number;
  transactions: number;
  errors: { itemId: string; message: string }[];
};

/**
 * Busca os dados dos bancos pelo backend e grava nas tabelas da Pluggy.
 * Não cria gastos: o usuário escolhe o que passar para os gastos.
 */
export async function syncBankData(): Promise<BankSyncResult> {
  const known = await listPluggyItems();
  const response = await fetchBankData({
    items: known.map(item => ({
      id: item.id,
      from: item.lastSyncedAt
        ? toISODate(addDays(new Date(item.lastSyncedAt), -OVERLAP_DAYS))
        : null,
    })),
  });

  // A nuvem devolve todas as conexões do usuário: a que sumiu de lá foi
  // removida e sai da tela.
  const returned = new Set(response.items.map(item => item.id));
  for (const item of known) {
    if (!returned.has(item.id)) {
      await removePluggyItem(item.id);
    }
  }

  const result: BankSyncResult = { items: 0, transactions: 0, errors: [] };
  for (const item of response.items) {
    try {
      if (item.error) {
        throw new Error(item.error);
      }
      // O item vem antes: as contas apontam para ele.
      await upsertBankItem({
        id: item.id,
        name: item.connectorName ?? null,
        bankUpdatedAt: item.lastUpdatedAt ?? null,
      });
      const accounts = item.accounts ?? [];
      await upsertPluggyAccounts(accounts.map(a => toAccountRow(a, item.id)));
      const rows = (item.transactions ?? []).flatMap(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        return account ? [toTransactionRow(transaction, account)] : [];
      });
      await upsertPluggyTransactions(rows);
      await markItemSynced(item.id, null);
      result.items += 1;
      result.transactions += rows.length;
      log(
        `banco: item ${item.id.slice(0, 8)} com ${rows.length} transação(ões)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markItemSynced(item.id, message).catch(() => undefined);
      result.errors.push({ itemId: item.id, message });
    }
  }
  return result;
}
