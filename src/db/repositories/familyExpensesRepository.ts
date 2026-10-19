import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';

import { db } from '../client';
import { expenseDisputes, type ExpenseDisputeRow } from '../disputeSchema';
import { categories, expenses } from '../schema';
import type { ExpenseListItem } from './expensesRepository';

export type FamilyExpenseRow = ExpenseListItem & {
  /** Usuário que lançou; vazio num gasto deste celular que ainda não subiu. */
  createdByUserId: string | null;
};

/**
 * Gastos de família entre duas datas, inclusive, do mais recente ao mais
 * antigo. Inclui os lançados por outros membros e recebidos da nuvem.
 */
export async function listFamilyExpenses(
  from: string,
  to: string,
): Promise<FamilyExpenseRow[]> {
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
      // Gasto de família nunca tem membro.
      memberName: sql<string | null>`NULL`,
      createdByUserId: expenses.createdByUserId,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        eq(expenses.scope, 'family'),
        isNull(expenses.deletedAt),
        gte(expenses.date, from),
        lte(expenses.date, to),
      ),
    )
    .orderBy(desc(expenses.date), desc(expenses.createdAt));
}

/** Contestações dos gastos informados, da mais recente para a mais antiga. */
export async function listDisputesFor(
  expenseIds: string[],
): Promise<ExpenseDisputeRow[]> {
  if (expenseIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(expenseDisputes)
    .where(inArray(expenseDisputes.expenseId, expenseIds))
    .orderBy(desc(expenseDisputes.createdAt));
}
