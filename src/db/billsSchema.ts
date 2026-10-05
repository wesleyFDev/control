/**
 * Cartões de crédito, compras parceladas e boletos.
 *
 * - Uma compra no cartão gera parcelas, cada uma na fatura de um mês. A
 *   fatura não é uma tabela: é o conjunto das parcelas de um cartão num mês
 *   (`card_id` + `reference_month`). Pagar a fatura paga todas elas juntas.
 * - Um boleto gera uma ou mais parcelas, pagas uma a uma.
 * - Nada vira gasto antes de ser pago. Ao marcar como paga, cada parcela
 *   cria um gasto, e `expense_id` guarda essa ligação.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { categories, expenses, members } from './schema';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

export const creditCards = sqliteTable('credit_cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Dia do mês em que a fatura fecha, de 1 a 31. */
  closingDay: integer('closing_day').notNull(),
  /** Dia do mês em que a fatura vence, de 1 a 31. */
  dueDay: integer('due_day').notNull(),
  ...timestamps,
});

export const PAYABLE_KINDS = ['card', 'boleto'] as const;
export type PayableKind = (typeof PAYABLE_KINDS)[number];

/** Uma compra no cartão ou um boleto, à vista ou parcelado. */
export const payables = sqliteTable(
  'payables',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: PAYABLE_KINDS }).notNull(),
    /** Só para compras no cartão. */
    cardId: text('card_id').references(() => creditCards.id, {
      onDelete: 'restrict',
    }),
    description: text('description').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    scope: text('scope', { enum: ['personal', 'family'] }).notNull(),
    memberId: text('member_id').references(() => members.id, {
      onDelete: 'restrict',
    }),
    totalCents: integer('total_cents').notNull(),
    installmentsCount: integer('installments_count').notNull(),
    /** Data da compra (cartão) ou do primeiro vencimento (boleto). */
    startDate: text('start_date').notNull(),
    ...timestamps,
  },
  table => [index('payables_card_id_idx').on(table.cardId)],
);

export const payableInstallments = sqliteTable(
  'payable_installments',
  {
    id: text('id').primaryKey(),
    payableId: text('payable_id')
      .notNull()
      .references(() => payables.id, { onDelete: 'restrict' }),
    number: integer('number').notNull(),
    amountCents: integer('amount_cents').notNull(),
    /** Mês da fatura (cartão) ou do vencimento (boleto), AAAA-MM. */
    referenceMonth: text('reference_month').notNull(),
    dueDate: text('due_date').notNull(),
    /** Preenchido quando a parcela é paga. Antes disso, não é gasto. */
    paidAt: text('paid_at'),
    expenseId: text('expense_id').references(() => expenses.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  table => [
    index('payable_installments_payable_id_idx').on(table.payableId),
    index('payable_installments_reference_month_idx').on(table.referenceMonth),
  ],
);

export type CreditCardRow = typeof creditCards.$inferSelect;
export type PayableRow = typeof payables.$inferSelect;
export type PayableInstallmentRow = typeof payableInstallments.$inferSelect;
