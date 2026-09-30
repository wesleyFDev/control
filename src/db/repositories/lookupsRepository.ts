import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { db } from '../client';
import {
  categories,
  members,
  type CategoryRow,
  type MemberRow,
} from '../schema';

/** Categorias ativas, na ordem de exibição. */
export async function listCategories(): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** Membros ativos, com você primeiro. */
export async function listMembers(): Promise<MemberRow[]> {
  return db
    .select()
    .from(members)
    .where(isNull(members.deletedAt))
    .orderBy(desc(members.isSelf), asc(members.name));
}

/** Id do membro que representa o próprio usuário. */
export async function getSelfMemberId(): Promise<string | null> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.isSelf, true), isNull(members.deletedAt)))
    .limit(1);
  return rows[0]?.id ?? null;
}
