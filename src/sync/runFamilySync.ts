import { currentUserId } from '../backend/session';
import { fetchMyFamily, type MyFamily } from '../backend/familyService';
import { supabase } from '../backend/supabase';
import { refreshCategoryRegistry } from '../db/repositories/categoriesRepository';
import {
  pullFamilyExpenses,
  pushFamilyExpenses,
  syncFamilyMembers,
} from './familySync';
import { supabaseFamilyRemote } from './supabaseRemote';

export type FamilySyncResult =
  | { status: 'disabled' | 'signed-out' }
  | { status: 'no-family' }
  | { status: 'ok'; family: MyFamily; pushed: number; pulled: number };

let running: Promise<FamilySyncResult> | null = null;

/**
 * Envia os gastos de família deste aparelho e recebe os dos outros membros.
 * Chamadas ao mesmo tempo compartilham a mesma execução.
 */
export function runFamilySync(): Promise<FamilySyncResult> {
  if (!running) {
    running = sync().finally(() => {
      running = null;
    });
  }
  return running;
}

async function sync(): Promise<FamilySyncResult> {
  if (!supabase) {
    return { status: 'disabled' };
  }
  const userId = currentUserId();
  if (!userId) {
    return { status: 'signed-out' };
  }

  const mine = await fetchMyFamily();
  if (!mine) {
    await syncFamilyMembers([], userId);
    return { status: 'no-family' };
  }

  await syncFamilyMembers(
    mine.members.map(m => ({ userId: m.userId, displayName: m.displayName })),
    userId,
  );
  const ctx = { familyId: mine.family.id, userId };
  const pushed = await pushFamilyExpenses(ctx, supabaseFamilyRemote);
  const { pulled, newCategories } = await pullFamilyExpenses(
    mine.family.id,
    supabaseFamilyRemote,
  );
  if (newCategories > 0) {
    await refreshCategoryRegistry();
  }
  return { status: 'ok', family: mine, pushed, pulled };
}
