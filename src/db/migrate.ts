import { useMigrations } from 'drizzle-orm/op-sqlite/migrator';

import { db } from './client';
import migrations from './migrations/migrations';

/** Aplica as migrations pendentes na abertura do app. */
export function useDatabaseMigrations() {
  return useMigrations(db, migrations);
}
