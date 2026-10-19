/**
 * Cópia local das contestações de gastos de família. Quem manda é a nuvem:
 * abrir e encerrar uma contestação acontece no Supabase, e esta tabela só
 * recebe o resultado na sincronização, para a tela funcionar sem internet.
 */
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const DISPUTE_STATUSES = ['open', 'resolved'] as const;

export const expenseDisputes = sqliteTable(
  'expense_disputes',
  {
    id: text('id').primaryKey(),
    /** Gasto contestado. Sem chave estrangeira: pode chegar antes do gasto. */
    expenseId: text('expense_id').notNull(),
    familyId: text('family_id').notNull(),
    openedByUserId: text('opened_by_user_id'),
    /** Motivo da contestação, escrito por quem contestou. */
    reason: text('reason').notNull(),
    status: text('status', { enum: DISPUTE_STATUSES }).notNull(),
    /** O que foi combinado, escrito por quem encerrou. */
    resolutionNote: text('resolution_note'),
    resolvedByUserId: text('resolved_by_user_id'),
    resolvedAt: text('resolved_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [index('expense_disputes_expense_id_idx').on(table.expenseId)],
);

export type ExpenseDisputeRow = typeof expenseDisputes.$inferSelect;
