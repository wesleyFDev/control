import type { ISODate } from '../../utils/dates';
import type { CategoryId } from './categories';

export type ExpenseScope = 'me' | 'family';

export type ExpenseDraft = {
  id: string;
  amountCents: number;
  categoryId: CategoryId;
  date: ISODate;
  scope: ExpenseScope | null;
  description: string;
};

export const SCOPE_LABELS: Record<ExpenseScope, string> = {
  me: 'Meu',
  family: 'Família',
};
