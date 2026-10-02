import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';

import { db } from '../client';
import { categories, expenses, members } from '../schema';
import type { ExpenseListItem } from './expensesRepository';

/** Gastos não apagados entre duas datas, inclusive, em ordem de data. */
export async function listExpensesBetween(
  from: string,
  to: string,
): Promise<ExpenseListItem[]> {
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
    .where(
      and(
        isNull(expenses.deletedAt),
        gte(expenses.date, from),
        lte(expenses.date, to),
      ),
    )
    .orderBy(asc(expenses.date));
}
