import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  deleteExpense,
  listExpenses,
  updateExpense,
  type ExpenseChanges,
  type ExpenseListItem,
} from '../../../db/repositories/expensesRepository';
import {
  listCategories,
  listMembers,
} from '../../../db/repositories/lookupsRepository';
import type { CategoryRow, MemberRow } from '../../../db/schema';

type State = {
  items: ExpenseListItem[];
  categories: CategoryRow[];
  members: MemberRow[];
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  items: [],
  categories: [],
  members: [],
  loading: true,
  error: null,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Histórico de gastos do banco local, recarregado sempre que a tela ganha foco. */
export function useExpenseHistory() {
  const [state, setState] = useState<State>(initialState);

  const reload = useCallback(async () => {
    try {
      const [items, categories, members] = await Promise.all([
        listExpenses(),
        listCategories(),
        listMembers(),
      ]);
      setState({ items, categories, members, loading: false, error: null });
    } catch (error) {
      setState(current => ({
        ...current,
        loading: false,
        error: errorMessage(error),
      }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteExpense(id);
      await reload();
    },
    [reload],
  );

  const save = useCallback(
    async (id: string, changes: ExpenseChanges) => {
      await updateExpense(id, changes);
      await reload();
    },
    [reload],
  );

  return { ...state, reload, remove, save };
}
