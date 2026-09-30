import { eq } from 'drizzle-orm';

import { CATEGORIES } from '../features/expenses/categories';
import { uuidv4 } from '../utils/uuid';
import { db } from './client';
import { categories, members } from './schema';

/** Nome inicial do usuário. Ele poderá trocar na tela de perfil. */
export const DEFAULT_SELF_NAME = 'Você';

/**
 * Garante os dados mínimos para o app funcionar. Pode rodar em toda abertura:
 * - Categorias padrão: só as que ainda não existem são inseridas, então
 *   nomes ou ícones que o usuário mudar não são sobrescritos.
 * - Membro "você": criado uma única vez.
 */
export async function ensureSeedData(): Promise<void> {
  const now = new Date().toISOString();

  await db
    .insert(categories)
    .values(
      CATEGORIES.map((category, index) => ({
        id: category.id,
        name: category.label,
        icon: category.icon,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: categories.id });

  const self = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.isSelf, true))
    .limit(1);

  if (self.length === 0) {
    await db.insert(members).values({
      id: uuidv4(),
      name: DEFAULT_SELF_NAME,
      isSelf: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
