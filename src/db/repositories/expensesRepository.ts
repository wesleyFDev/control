import { and, desc, eq, isNull } from 'drizzle-orm';

import { uuidv4 } from '../../utils/uuid';
import { db } from '../client';
import { categories, expenses, members } from '../schema';

/** Gasto com o nome e o ícone da categoria e o nome do membro, para listas. */
export type ExpenseListItem = {
  id: string;
  amountCents: number;
  date: string;
  scope: 'personal' | 'family';
  description: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  memberId: string | null;
  memberName: string | null;
};

export type ExpenseChanges = {
  amountCents: number;
  categoryId: string;
  date: string;
  scope: 'personal' | 'family';
  memberId: string | null;
  description: string | null;
};

export type NewExpense = ExpenseChanges & {
  source: 'chat' | 'manual' | 'installment';
  /** Frase original do chat. */
  rawText: string | null;
};

/** Grava um gasto novo e devolve o id gerado. */
export async function createExpense(input: NewExpense): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.insert(expenses).values({
    ...input,
    id,
    memberId: input.scope === 'family' ? null : input.memberId,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** Todos os gastos não apagados, do mais recente para o mais antigo. */
export async function listExpenses(): Promise<ExpenseListItem[]> {
  return db
    .select({
      id: expenses.id,
      amountCents: expenses.amountCents,
      date: expenses.date,
      scope: expenses.scope,
      description: expenses.description,
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      memberId: expenses.memberId,
      memberName: members.name,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(members, eq(expenses.memberId, members.id))
    .where(isNull(expenses.deletedAt))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));
}

/** Atualiza um gasto. Gasto de família nunca tem membro. */
export async function updateExpense(
  id: string,
  changes: ExpenseChanges,
): Promise<void> {
  await db
    .update(expenses)
    .set({
      ...changes,
      memberId: changes.scope === 'family' ? null : changes.memberId,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)));
}

/**
 * Exclusão lógica: o gasto some das listas, mas a linha fica no banco com
 * `deleted_at`, para a exclusão poder ser sincronizada no futuro.
 */
export async function deleteExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(expenses)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)));
}
