import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  listCategories,
  listMembers,
} from '../../../db/repositories/lookupsRepository';
import type { CategoryRow, MemberRow } from '../../../db/schema';

type State = {
  categories: CategoryRow[];
  members: MemberRow[];
  loading: boolean;
  error: string | null;
};

/** Categorias e membros do banco, recarregados sempre que a tela ganha foco. */
export function useExpenseLookups() {
  const [state, setState] = useState<State>({
    categories: [],
    members: [],
    loading: true,
    error: null,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([listCategories(), listMembers()])
        .then(([categories, members]) => {
          if (active) {
            setState({ categories, members, loading: false, error: null });
          }
        })
        .catch(error => {
          if (active) {
            setState(current => ({
              ...current,
              loading: false,
              error: error instanceof Error ? error.message : String(error),
            }));
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return state;
}
