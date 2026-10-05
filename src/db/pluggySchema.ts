/**
 * Tabelas da integração com a Pluggy, separadas das tabelas do app.
 *
 * Elas guardam os dados como vieram da Pluggy, sem misturar com os gastos.
 * A mesclagem com a tabela `expenses` fica para depois: a coluna
 * `expense_id` de `pluggy_transactions` existe para ligar cada transação
 * ao gasto criado a partir dela, quando isso for feito.
 *
 * Os ids são os da própria Pluggy, então baixar a mesma transação de novo
 * atualiza a linha em vez de duplicar.
 *
 * As credenciais (Client ID e Client Secret) não ficam aqui: ficam no
 * Keychain do iOS e no Keystore do Android.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { expenses } from './schema';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

/** Conexões do Meu Pluggy, uma por banco. O id é o itemId do Dashboard. */
export const pluggyItems = sqliteTable('pluggy_items', {
  id: text('id').primaryKey(),
  /** Última sincronização bem-sucedida, em ISO 8601 UTC. */
  lastSyncedAt: text('last_synced_at'),
  /** Mensagem do último erro de sincronização, se houver. */
  lastError: text('last_error'),
  ...timestamps,
});

/** Contas e cartões de cada item. */
export const pluggyAccounts = sqliteTable(
  'pluggy_accounts',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => pluggyItems.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    marketingName: text('marketing_name'),
    /** BANK ou CREDIT. */
    type: text('type').notNull(),
    subtype: text('subtype'),
    number: text('number'),
    balanceCents: integer('balance_cents').notNull(),
    currencyCode: text('currency_code').notNull(),
    /** Resposta completa da Pluggy, para não perder campos na mesclagem. */
    rawJson: text('raw_json').notNull(),
    ...timestamps,
  },
  table => [index('pluggy_accounts_item_id_idx').on(table.itemId)],
);

/** Transações como vieram da Pluggy. */
export const pluggyTransactions = sqliteTable(
  'pluggy_transactions',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => pluggyAccounts.id, { onDelete: 'restrict' }),
    /** Dia local da transação, AAAA-MM-DD, já convertido do UTC da Pluggy. */
    date: text('date').notNull(),
    /** Data original da Pluggy, em ISO 8601 UTC. */
    postedAt: text('posted_at').notNull(),
    description: text('description').notNull(),
    /** Valor com o sinal da Pluggy, em centavos. */
    amountCents: integer('amount_cents').notNull(),
    currencyCode: text('currency_code').notNull(),
    /** DEBIT ou CREDIT. */
    type: text('type').notNull(),
    /** PENDING ou POSTED. Transações pendentes podem mudar até serem lançadas. */
    status: text('status').notNull(),
    operationType: text('operation_type'),
    category: text('category'),
    installmentNumber: integer('installment_number'),
    totalInstallments: integer('total_installments'),
    /** Resultado das regras de gasto no momento da sincronização. */
    isExpenseCandidate: integer('is_expense_candidate', {
      mode: 'boolean',
    }).notNull(),
    ignoreReason: text('ignore_reason'),
    /** Gasto criado a partir desta transação, quando a mesclagem existir. */
    expenseId: text('expense_id').references(() => expenses.id, {
      onDelete: 'set null',
    }),
    rawJson: text('raw_json').notNull(),
    ...timestamps,
  },
  table => [
    index('pluggy_transactions_account_id_idx').on(table.accountId),
    index('pluggy_transactions_date_idx').on(table.date),
    index('pluggy_transactions_expense_id_idx').on(table.expenseId),
  ],
);

export type PluggyItemRow = typeof pluggyItems.$inferSelect;
export type PluggyAccountRow = typeof pluggyAccounts.$inferSelect;
export type PluggyTransactionRow = typeof pluggyTransactions.$inferSelect;
