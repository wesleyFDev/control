import { requireSupabase } from './supabase';

/**
 * Contestação de gastos de família. As duas ações acontecem na nuvem, pelas
 * funções open_dispute e resolve_dispute, que conferem quem pode fazer o
 * quê. Precisam de internet; o resultado chega ao celular na sincronização.
 */

function fail(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function openDispute(
  expenseId: string,
  reason: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc('open_dispute', {
    p_expense_id: expenseId,
    p_reason: reason.trim(),
  });
  fail(error);
}

export async function resolveDispute(
  disputeId: string,
  note: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc('resolve_dispute', {
    p_dispute_id: disputeId,
    p_note: note.trim(),
  });
  fail(error);
}
