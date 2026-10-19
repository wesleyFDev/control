import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { openDispute, resolveDispute } from '../../backend/disputeService';
import { useSession } from '../../backend/session';
import { backendConfigured } from '../../config/backend';
import { onExpensesChanged } from '../../db/changeEvents';
import {
  deleteExpense,
  updateExpense,
  type ExpenseChanges,
} from '../../db/repositories/expensesRepository';
import {
  listDisputesFor,
  listFamilyExpenses,
} from '../../db/repositories/familyExpensesRepository';
import {
  listCategories,
  listMembers,
} from '../../db/repositories/lookupsRepository';
import type { CategoryRow, MemberRow } from '../../db/schema';
import { runFamilySync } from '../../sync/runFamilySync';
import { periodRange, type Period } from '../reports/report';
import {
  buildFamilyExpenseViews,
  type FamilyExpenseView,
} from './familyExpenseView';

/**
 * - local: sem backend ou sem conta; os gastos de família ficam só aqui.
 * - no-family: logado, mas fora de uma família.
 * - synced: sincronizado com a família na nuvem.
 */
export type FamilySyncStatus = 'local' | 'no-family' | 'synced';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Gastos de família de um período, com quem lançou e as contestações.
 * Sincroniza ao abrir a tela e ao puxar para atualizar.
 */
export function useFamilyExpenses(period: Period) {
  const { session } = useSession();
  const myUserId = session?.user.id ?? null;
  const [items, setItems] = useState<FamilyExpenseView[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<FamilySyncStatus>('local');
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = periodRange(period);
  // Contestar e encerrar acontecem na nuvem: só com a família conectada.
  const online = status === 'synced';

  const reload = useCallback(async () => {
    try {
      const [rows, categoryRows, memberRows] = await Promise.all([
        listFamilyExpenses(from, to),
        listCategories(),
        listMembers(),
      ]);
      const disputes = await listDisputesFor(rows.map(r => r.id));
      setItems(
        buildFamilyExpenseViews(rows, disputes, memberRows, myUserId, online),
      );
      setCategories(categoryRows);
      setMembers(memberRows);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, to, myUserId, online]);

  const sync = useCallback(async () => {
    if (!backendConfigured || !session) {
      setStatus('local');
      return;
    }
    setSyncing(true);
    try {
      const result = await runFamilySync();
      if (result.status === 'ok') {
        setStatus('synced');
        setFamilyName(result.family.family.name);
      } else {
        setStatus(result.status === 'no-family' ? 'no-family' : 'local');
        setFamilyName(null);
      }
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync]),
  );

  // Recarrega ao trocar de mês, ao terminar a sincronização e quando um
  // gasto muda em outra tela.
  useEffect(() => {
    reload();
  }, [reload, syncing]);
  useEffect(() => onExpensesChanged(() => reload()), [reload]);

  const remove = useCallback(async (id: string) => {
    await deleteExpense(id);
  }, []);

  const save = useCallback(async (id: string, changes: ExpenseChanges) => {
    await updateExpense(id, changes);
  }, []);

  const dispute = useCallback(
    async (expenseId: string, reason: string) => {
      // O gasto precisa estar na nuvem: envia o que estiver pendente antes.
      await runFamilySync();
      await openDispute(expenseId, reason);
      await sync();
    },
    [sync],
  );

  const resolve = useCallback(
    async (disputeId: string, note: string) => {
      await resolveDispute(disputeId, note);
      await sync();
    },
    [sync],
  );

  return {
    items,
    categories,
    members,
    loading,
    syncing,
    status,
    familyName,
    error,
    sync,
    remove,
    save,
    dispute,
    resolve,
  };
}
