import { and, asc, eq, inArray, isNull, max, ne } from 'drizzle-orm';

import { normalize } from '../../ai/parsers/normalize';
import {
  DEFAULT_CATEGORY_ID,
  setCategories,
  type Category,
} from '../../features/expenses/categories';
import { uuidv4 } from '../../utils/uuid';
import type { FeatherIconName } from '@react-native-vector-icons/feather/static';
import { db } from '../client';
import { categories, categoryKeywords } from '../schema';

export type CategoryInput = {
  name: string;
  icon: string;
  keywords: string[];
};

export type CategoryWithKeywords = {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  keywords: string[];
};

/** Erro de validação com mensagem pronta para mostrar ao usuário. */
export class CategoryValidationError extends Error {}

/** Palavra-chave no formato do categoryMatcher: minúsculas, sem acento. */
export function normalizeKeyword(keyword: string): string {
  return normalize(keyword).trim().replace(/\s+/g, ' ');
}

function uniqueKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map(normalizeKeyword).filter(Boolean))];
}

/** Categorias ativas com as palavras-chave ativas, "Outros" por último. */
export async function listCategoriesWithKeywords(): Promise<
  CategoryWithKeywords[]
> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const keywordRows = await db
    .select({
      categoryId: categoryKeywords.categoryId,
      keyword: categoryKeywords.keyword,
    })
    .from(categoryKeywords)
    .where(isNull(categoryKeywords.deletedAt))
    .orderBy(asc(categoryKeywords.keyword));

  const byCategory = new Map<string, string[]>();
  for (const row of keywordRows) {
    const list = byCategory.get(row.categoryId) ?? [];
    list.push(row.keyword);
    byCategory.set(row.categoryId, list);
  }

  const list = rows.map(row => ({
    ...row,
    keywords: byCategory.get(row.id) ?? [],
  }));
  const others = list.filter(c => c.id === DEFAULT_CATEGORY_ID);
  return [...list.filter(c => c.id !== DEFAULT_CATEGORY_ID), ...others];
}

export async function getCategoryWithKeywords(
  id: string,
): Promise<CategoryWithKeywords | null> {
  const list = await listCategoriesWithKeywords();
  return list.find(c => c.id === id) ?? null;
}

/** Recarrega o registro em memória usado pelo chat e pelo categoryMatcher. */
export async function refreshCategoryRegistry(): Promise<void> {
  const list = await listCategoriesWithKeywords();
  const registry: Category[] = list.map(c => ({
    id: c.id,
    label: c.name,
    icon: c.icon as FeatherIconName,
    keywords: c.keywords,
  }));
  setCategories(registry);
}

/**
 * Confere nome e palavras-chave antes de gravar qualquer coisa.
 * O driver do Drizzle para o op-sqlite não garante transações, então
 * validar antes evita deixar a categoria gravada pela metade.
 */
async function validate(
  input: CategoryInput,
  currentId: string | null,
): Promise<{ name: string; keywords: string[] }> {
  const name = input.name.trim();
  if (!name) {
    throw new CategoryValidationError('Dê um nome para a categoria.');
  }

  const sameName = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(isNull(categories.deletedAt));
  const duplicate = sameName.find(
    c =>
      c.id !== currentId && normalizeKeyword(c.name) === normalizeKeyword(name),
  );
  if (duplicate) {
    throw new CategoryValidationError(
      `Já existe uma categoria chamada "${duplicate.name}".`,
    );
  }

  const keywords = uniqueKeywords(input.keywords);
  if (keywords.length > 0) {
    const conflicts = await db
      .select({
        keyword: categoryKeywords.keyword,
        categoryName: categories.name,
      })
      .from(categoryKeywords)
      .innerJoin(categories, eq(categoryKeywords.categoryId, categories.id))
      .where(
        and(
          isNull(categoryKeywords.deletedAt),
          inArray(categoryKeywords.keyword, keywords),
          currentId ? ne(categoryKeywords.categoryId, currentId) : undefined,
        ),
      );
    if (conflicts.length > 0) {
      const first = conflicts[0];
      throw new CategoryValidationError(
        `A palavra "${first.keyword}" já está na categoria ${first.categoryName}.`,
      );
    }
  }

  return { name, keywords };
}

async function insertKeywords(categoryId: string, keywords: string[]) {
  if (keywords.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  await db.insert(categoryKeywords).values(
    keywords.map(keyword => ({
      id: uuidv4(),
      categoryId,
      keyword,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function createCategory(input: CategoryInput): Promise<string> {
  const { name, keywords } = await validate(input, null);
  const now = new Date().toISOString();
  const [{ lastOrder }] = await db
    .select({ lastOrder: max(categories.sortOrder) })
    .from(categories);

  const id = uuidv4();
  await db.insert(categories).values({
    id,
    name,
    icon: input.icon,
    sortOrder: (lastOrder ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  });
  await insertKeywords(id, keywords);
  await refreshCategoryRegistry();
  return id;
}

/** Atualiza nome, ícone e palavras-chave. Palavras removidas são apagadas. */
export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<void> {
  const { name, keywords } = await validate(input, id);
  const now = new Date().toISOString();

  await db
    .update(categories)
    .set({ name, icon: input.icon, updatedAt: now })
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)));

  const current = await db
    .select({ id: categoryKeywords.id, keyword: categoryKeywords.keyword })
    .from(categoryKeywords)
    .where(
      and(
        eq(categoryKeywords.categoryId, id),
        isNull(categoryKeywords.deletedAt),
      ),
    );

  const removed = current.filter(k => !keywords.includes(k.keyword));
  if (removed.length > 0) {
    await db
      .update(categoryKeywords)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        inArray(
          categoryKeywords.id,
          removed.map(k => k.id),
        ),
      );
  }

  const existing = new Set(current.map(k => k.keyword));
  await insertKeywords(
    id,
    keywords.filter(k => !existing.has(k)),
  );
  await refreshCategoryRegistry();
}

/**
 * Exclusão lógica da categoria e das palavras-chave dela. Os gastos antigos
 * continuam apontando para ela e aparecem com o nome que ela tinha.
 */
export async function deleteCategory(id: string): Promise<void> {
  if (id === DEFAULT_CATEGORY_ID) {
    throw new CategoryValidationError(
      'A categoria "Outros" não pode ser apagada. Ela recebe os gastos sem categoria.',
    );
  }
  const now = new Date().toISOString();
  await db
    .update(categoryKeywords)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(categoryKeywords.categoryId, id),
        isNull(categoryKeywords.deletedAt),
      ),
    );
  await db
    .update(categories)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)));
  await refreshCategoryRegistry();
}
