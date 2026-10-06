import { requireSupabase } from '../backend/supabase';
import type {
  FamilyRemote,
  RemoteExpense,
  RemoteExpenseInput,
} from './familySync';

const PAGE_SIZE = 500;

/** FamilyRemote sobre a tabela `family_expenses` do Supabase. */
export const supabaseFamilyRemote: FamilyRemote = {
  async upsertExpenses(rows: RemoteExpenseInput[]) {
    const { error } = await requireSupabase()
      .from('family_expenses')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      throw new Error(error.message);
    }
  },

  async pullExpenses(familyId: string, since: string | null) {
    const all: RemoteExpense[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = requireSupabase()
        .from('family_expenses')
        .select('*')
        .eq('family_id', familyId)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (since) {
        query = query.gt('updated_at', since);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      all.push(...((data ?? []) as RemoteExpense[]));
      if (!data || data.length < PAGE_SIZE) {
        return all;
      }
    }
  },
};
