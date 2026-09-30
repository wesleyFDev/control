import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';

import { withDrizzleCompat } from './opsqliteCompat';

/** Banco local no diretório padrão do app (Library no iOS, databases no Android). */
export const sqlite = open({ name: 'gastos.db' });

// WAL deixa leituras e escritas concorrentes mais rápidas sem perder a
// proteção contra corrupção. Nunca usar journal_mode MEMORY ou OFF.
sqlite.executeSync('PRAGMA journal_mode = WAL;');
sqlite.executeSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(withDrizzleCompat(sqlite));
