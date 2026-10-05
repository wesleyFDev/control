import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../client';
import {
  pluggyAccounts,
  pluggyItems,
  pluggyTransactions,
  type PluggyAccountRow,
  type PluggyItemRow,
  type PluggyTransactionRow,
} from '../pluggySchema';

/**
 * Inserir muitas linhas de uma vez pode passar do limite de parâmetros do
 * SQLite. As transações são gravadas em blocos.
 */
const CHUNK_SIZE = 40;

function nowIso(): string {
  return new Date().toISOString();
}

/** Colunas atualizadas com o valor novo quando a linha já existe. */
function excluded(columns: string[]) {
  return Object.fromEntries(
    columns.map(column => [column, sql.raw(`excluded.${toSnake(column)}`)]),
  );
}

function toSnake(name: string): string {
  return name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ---------- Itens ----------

export async function listPluggyItems(): Promise<PluggyItemRow[]> {
  return db
    .select()
    .from(pluggyItems)
    .where(isNull(pluggyItems.deletedAt))
    .orderBy(pluggyItems.createdAt);
}

/** Adiciona um itemId. Um item removido antes volta a valer. */
export async function addPluggyItem(itemId: string): Promise<void> {
  const now = nowIso();
  await db
    .insert(pluggyItems)
    .values({ id: itemId, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: pluggyItems.id,
      set: { deletedAt: null, updatedAt: now },
    });
}

/** Tira o item da sincronização. Os dados já baixados continuam no banco. */
export async function removePluggyItem(itemId: string): Promise<void> {
  const now = nowIso();
  await db
    .update(pluggyItems)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(pluggyItems.id, itemId));
}

export async function markItemSynced(
  itemId: string,
  error: string | null,
): Promise<void> {
  const now = nowIso();
  await db
    .update(pluggyItems)
    .set(
      error
        ? { lastError: error, updatedAt: now }
        : { lastSyncedAt: now, lastError: null, updatedAt: now },
    )
    .where(eq(pluggyItems.id, itemId));
}

// ---------- Contas ----------

export type NewPluggyAccount = Omit<
  PluggyAccountRow,
  'createdAt' | 'updatedAt' | 'deletedAt'
>;

export async function upsertPluggyAccounts(
  accounts: NewPluggyAccount[],
): Promise<void> {
  if (accounts.length === 0) {
    return;
  }
  const now = nowIso();
  await db
    .insert(pluggyAccounts)
    .values(accounts.map(a => ({ ...a, createdAt: now, updatedAt: now })))
    .onConflictDoUpdate({
      target: pluggyAccounts.id,
      set: {
        ...excluded([
          'itemId',
          'name',
          'marketingName',
          'type',
          'subtype',
          'number',
          'balanceCents',
          'currencyCode',
          'rawJson',
        ]),
        updatedAt: now,
        deletedAt: null,
      },
    });
}

export type PluggyAccountSummary = PluggyAccountRow & {
  transactionCount: number;
  candidateCount: number;
};

/** Contas dos itens ativos, com quantas transações e possíveis gastos cada uma tem. */
export async function listPluggyAccounts(): Promise<PluggyAccountSummary[]> {
  const accounts = await db
    .select({ account: pluggyAccounts })
    .from(pluggyAccounts)
    .innerJoin(pluggyItems, eq(pluggyAccounts.itemId, pluggyItems.id))
    .where(and(isNull(pluggyAccounts.deletedAt), isNull(pluggyItems.deletedAt)))
    .orderBy(pluggyAccounts.name);

  const counts = await db
    .select({
      accountId: pluggyTransactions.accountId,
      candidate: pluggyTransactions.isExpenseCandidate,
      total: count(),
    })
    .from(pluggyTransactions)
    .where(isNull(pluggyTransactions.deletedAt))
    .groupBy(
      pluggyTransactions.accountId,
      pluggyTransactions.isExpenseCandidate,
    );

  return accounts.map(({ account }) => {
    const rows = counts.filter(c => c.accountId === account.id);
    return {
      ...account,
      transactionCount: rows.reduce((sum, r) => sum + Number(r.total), 0),
      candidateCount: rows
        .filter(r => r.candidate)
        .reduce((sum, r) => sum + Number(r.total), 0),
    };
  });
}

// ---------- Transações ----------

export type NewPluggyTransaction = Omit<
  PluggyTransactionRow,
  'createdAt' | 'updatedAt' | 'deletedAt' | 'expenseId'
>;

/**
 * Grava ou atualiza as transações pelo id da Pluggy. A ligação com um gasto
 * (`expense_id`) e a data de criação são preservadas.
 */
export async function upsertPluggyTransactions(
  transactions: NewPluggyTransaction[],
): Promise<void> {
  const now = nowIso();
  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    const chunk = transactions.slice(i, i + CHUNK_SIZE);
    await db
      .insert(pluggyTransactions)
      .values(chunk.map(t => ({ ...t, createdAt: now, updatedAt: now })))
      .onConflictDoUpdate({
        target: pluggyTransactions.id,
        set: {
          ...excluded([
            'accountId',
            'date',
            'postedAt',
            'description',
            'amountCents',
            'currencyCode',
            'type',
            'status',
            'operationType',
            'category',
            'installmentNumber',
            'totalInstallments',
            'isExpenseCandidate',
            'ignoreReason',
            'rawJson',
          ]),
          updatedAt: now,
        },
      });
  }
}

export async function listPluggyTransactions(
  accountId: string,
  limit = 200,
): Promise<PluggyTransactionRow[]> {
  return db
    .select()
    .from(pluggyTransactions)
    .where(
      and(
        eq(pluggyTransactions.accountId, accountId),
        isNull(pluggyTransactions.deletedAt),
      ),
    )
    .orderBy(desc(pluggyTransactions.date), desc(pluggyTransactions.postedAt))
    .limit(limit);
}
