import { eq, inArray } from 'drizzle-orm';

import { DEFAULT_CATEGORIES } from '../features/expenses/categories';
import { uuidv4 } from '../utils/uuid';
import { db } from './client';
import { categories, categoryKeywords, members } from './schema';

/** Nome inicial do usuário. Ele poderá trocar na tela de perfil. */
export const DEFAULT_SELF_NAME = 'Você';

/**
 * Garante os dados mínimos para o app funcionar. Pode rodar em toda abertura:
 * - Categorias padrão: só as que ainda não existem são inseridas, então
 *   nomes ou ícones que o usuário mudar não são sobrescritos.
 * - Palavras-chave padrão: gravadas só para a categoria que nunca teve
 *   nenhuma. Assim, uma palavra que o usuário apagar não volta sozinha.
 * - Membro "você": criado uma única vez.
 */
export async function ensureSeedData(): Promise<void> {
  const now = new Date().toISOString();

  await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((category, index) => ({
        id: category.id,
        name: category.label,
        icon: category.icon,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: categories.id });

  await seedDefaultKeywords(now);

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

async function seedDefaultKeywords(now: string): Promise<void> {
  const withKeywords = await db
    .selectDistinct({ categoryId: categoryKeywords.categoryId })
    .from(categoryKeywords)
    .where(
      inArray(
        categoryKeywords.categoryId,
        DEFAULT_CATEGORIES.map(c => c.id),
      ),
    );
  const seeded = new Set(withKeywords.map(row => row.categoryId));

  const rows = DEFAULT_CATEGORIES.filter(c => !seeded.has(c.id)).flatMap(
    category =>
      category.keywords.map(keyword => ({
        id: uuidv4(),
        categoryId: category.id,
        keyword,
        createdAt: now,
        updatedAt: now,
      })),
  );
  if (rows.length > 0) {
    // Ignora uma palavra padrão que o usuário já tenha posto em outra categoria.
    await db.insert(categoryKeywords).values(rows).onConflictDoNothing();
  }
}
