/**
 * Estado da sincronização com o Supabase, em pares chave e valor.
 * Ex.: o cursor dos gastos de família já baixados.
 */
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});
