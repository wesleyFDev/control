import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '../client';
import { expenses } from '../schema';
import { createExpense, deleteExpense } from './expensesRepository';
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

/**
 * Tira o banco da tela quando a conexão foi removida na nuvem. Os dados já
 * baixados e os gastos criados a partir deles continuam no aparelho.
 */
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

/**
 * Grava um item vindo do backend, com o nome do banco e a data em que o
 * banco atualizou os dados. A sincronização só é marcada como feita por
 * `markItemSynced`, depois de gravar as contas e as transações.
 */
export async function upsertBankItem(item: {
  id: string;
  name: string | null;
  bankUpdatedAt: string | null;
}): Promise<void> {
  const now = nowIso();
  const values = {
    name: item.name,
    bankUpdatedAt: item.bankUpdatedAt,
    deletedAt: null,
    updatedAt: now,
  };
  await db
    .insert(pluggyItems)
    .values({ id: item.id, ...values, createdAt: now })
    .onConflictDoUpdate({ target: pluggyItems.id, set: values });
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
          'creditLimitCents',
          'availableCreditLimitCents',
          'balanceCloseDate',
          'balanceDueDate',
          'currencyCode',
          'rawJson',
        ]),
        updatedAt: now,
        deletedAt: null,
      },
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

// ---------- Tela de bancos ----------

export type BankSummary = {
  item: PluggyItemRow;
  accounts: PluggyAccountRow[];
};

/** Bancos ativos com as contas e os cartões de cada um. */
export async function listBanks(): Promise<BankSummary[]> {
  const [items, accounts] = await Promise.all([
    listPluggyItems(),
    db
      .select()
      .from(pluggyAccounts)
      .where(isNull(pluggyAccounts.deletedAt))
      .orderBy(pluggyAccounts.name),
  ]);
  return items.map(item => ({
    item,
    accounts: accounts.filter(a => a.itemId === item.id),
  }));
}

export async function getBank(itemId: string): Promise<BankSummary | null> {
  const banks = await listBanks();
  return banks.find(b => b.item.id === itemId) ?? null;
}

/**
 * - pending: parece gasto e ainda não foi passada para os gastos.
 * - transferred: já virou gasto.
 * - ignored: não parece gasto (entrada, estorno, pagamento de fatura).
 */
export type BankTransactionFilter =
  | 'pending'
  | 'transferred'
  | 'ignored'
  | 'all';

export type BankTransaction = PluggyTransactionRow & {
  /** Ligada a um gasto que ainda existe. */
  transferred: boolean;
};

export async function listBankTransactions(
  accountId: string,
  filter: BankTransactionFilter = 'all',
  limit = 300,
): Promise<BankTransaction[]> {
  const rows = await db
    .select({ transaction: pluggyTransactions, expenseId: expenses.id })
    .from(pluggyTransactions)
    // Um gasto apagado em Detalhes solta a transação, que volta a ser "a passar".
    .leftJoin(
      expenses,
      and(
        eq(pluggyTransactions.expenseId, expenses.id),
        isNull(expenses.deletedAt),
      ),
    )
    .where(
      and(
        eq(pluggyTransactions.accountId, accountId),
        isNull(pluggyTransactions.deletedAt),
      ),
    )
    .orderBy(desc(pluggyTransactions.date), desc(pluggyTransactions.postedAt))
    .limit(limit);

  return rows
    .map(({ transaction, expenseId }) => ({
      ...transaction,
      transferred: expenseId !== null,
    }))
    .filter(t => {
      switch (filter) {
        case 'pending':
          return t.isExpenseCandidate && !t.transferred;
        case 'transferred':
          return t.transferred;
        case 'ignored':
          return !t.isExpenseCandidate && !t.transferred;
        default:
          return true;
      }
    });
}

export type TransferChoice = {
  transactionId: string;
  categoryId: string;
  description: string;
};

export type TransferOwner = {
  scope: 'personal' | 'family';
  /** Obrigatório quando o gasto é pessoal. */
  memberId: string | null;
};

/**
 * Passa transações do banco para os gastos do app. Cada uma vira um gasto
 * com o valor, a data e a descrição do banco, e fica ligada a ele. As que
 * já foram passadas são ignoradas. Devolve quantas viraram gasto.
 *
 * Como no pagamento de faturas, o driver não garante transação: cada gasto
 * é gravado e logo depois ligado, sem duplicar se algo falhar no meio.
 */
export async function transferToExpenses(
  choices: TransferChoice[],
  owner: TransferOwner,
): Promise<number> {
  if (owner.scope === 'personal' && !owner.memberId) {
    throw new Error('Escolha de quem é o gasto.');
  }
  const ids = choices.map(c => c.transactionId);
  if (ids.length === 0) {
    return 0;
  }
  const rows = await db
    .select({ transaction: pluggyTransactions, expenseId: expenses.id })
    .from(pluggyTransactions)
    .leftJoin(
      expenses,
      and(
        eq(pluggyTransactions.expenseId, expenses.id),
        isNull(expenses.deletedAt),
      ),
    )
    .where(
      and(
        inArray(pluggyTransactions.id, ids),
        isNull(pluggyTransactions.deletedAt),
      ),
    );

  let created = 0;
  for (const choice of choices) {
    const row = rows.find(r => r.transaction.id === choice.transactionId);
    if (!row || row.expenseId !== null) {
      continue;
    }
    const amountCents = Math.abs(row.transaction.amountCents);
    if (amountCents === 0) {
      continue;
    }
    const expenseId = await createExpense({
      amountCents,
      categoryId: choice.categoryId,
      date: row.transaction.date,
      scope: owner.scope,
      memberId: owner.scope === 'family' ? null : owner.memberId,
      description: choice.description.trim() || row.transaction.description,
      source: 'bank',
      rawText: row.transaction.description,
    });
    await db
      .update(pluggyTransactions)
      .set({ expenseId, updatedAt: nowIso() })
      .where(eq(pluggyTransactions.id, choice.transactionId));
    created += 1;
  }
  return created;
}

/** Desfaz a passagem: apaga o gasto criado e solta a transação. */
export async function undoTransfer(transactionId: string): Promise<void> {
  const [row] = await db
    .select({ expenseId: pluggyTransactions.expenseId })
    .from(pluggyTransactions)
    .where(eq(pluggyTransactions.id, transactionId));
  if (!row?.expenseId) {
    return;
  }
  await deleteExpense(row.expenseId);
  await db
    .update(pluggyTransactions)
    .set({ expenseId: null, updatedAt: nowIso() })
    .where(eq(pluggyTransactions.id, transactionId));
}
