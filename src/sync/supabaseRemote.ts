import { requireSupabase } from '../backend/supabase';
import type {
  FamilyRemote,
  RemoteDispute,
  RemoteExpense,
  RemoteExpenseInput,
} from './familySync';

const PAGE_SIZE = 500;

/** FamilyRemote sobre as tabelas `family_expenses` e `expense_disputes`. */
export const supabaseFamilyRemote: FamilyRemote = {
  async upsertExpenses(rows: RemoteExpenseInput[]) {
    const { error } = await requireSupabase()
      .from('family_expenses')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      throw new Error(error.message);
    }
  },

  pullExpenses(familyId: string, since: string | null) {
    return pullTable<RemoteExpense>('family_expenses', familyId, since);
  },

  pullDisputes(familyId: string, since: string | null) {
    return pullTable<RemoteDispute>('expense_disputes', familyId, since);
  },
};

/** Linhas da família alteradas depois de `since`, juntando as páginas. */
async function pullTable<T>(
  table: string,
  familyId: string,
  since: string | null,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = requireSupabase()
      .from(table)
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
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) {
      return all;
    }
  }
}
