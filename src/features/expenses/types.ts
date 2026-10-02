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
  /**
   * De onde veio a categoria: de uma palavra-chave, do padrão "Outros"
   * por falta de palavra-chave, ou da IA.
   */
  categorySource?: 'keyword' | 'default' | 'ai';
};

export const SCOPE_LABELS: Record<ExpenseScope, string> = {
  me: 'Meu',
  family: 'Família',
};
