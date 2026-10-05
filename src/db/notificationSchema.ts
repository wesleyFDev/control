/**
 * Notificações dos apps de banco, separadas das tabelas do app, como as da
 * Pluggy. Cada linha é uma notificação capturada, já interpretada pelas
 * regras. Nada vira gasto ainda: `expense_id` vai ligar a notificação ao
 * gasto quando a mesclagem existir.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { expenses } from './schema';

export const notificationCaptures = sqliteTable(
  'notification_captures',
  {
    /** Pacote, chave da notificação e horário: a mesma notificação não entra duas vezes. */
    id: text('id').primaryKey(),
    packageName: text('package_name').notNull(),
    /** Nome do app como aparece no celular, como "Nubank". */
    appLabel: text('app_label'),
    /** allowed: app marcado para sempre capturar. money: tinha valor em R$. */
    matchedBy: text('matched_by'),
    title: text('title').notNull(),
    text: text('text').notNull(),
    /** Horário da notificação, em ISO 8601 UTC. */
    postedAt: text('posted_at').notNull(),
    /** Dia local da notificação, AAAA-MM-DD. */
    date: text('date').notNull(),
    amountCents: integer('amount_cents'),
    merchant: text('merchant'),
    /** Categoria pelas palavras-chave. A IA entra na revisão, depois. */
    categoryId: text('category_id'),
    isExpenseCandidate: integer('is_expense_candidate', {
      mode: 'boolean',
    }).notNull(),
    ignoreReason: text('ignore_reason'),
    expenseId: text('expense_id').references(() => expenses.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  table => [
    index('notification_captures_date_idx').on(table.date),
    index('notification_captures_package_idx').on(table.packageName),
  ],
);

export type NotificationCaptureRow = typeof notificationCaptures.$inferSelect;
export type NewNotificationCapture = typeof notificationCaptures.$inferInsert;
