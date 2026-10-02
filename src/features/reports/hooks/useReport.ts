import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { ExpenseListItem } from '../../../db/repositories/expensesRepository';
import { getSelfMemberId } from '../../../db/repositories/lookupsRepository';
import { listExpensesBetween } from '../../../db/repositories/reportsRepository';
import { toISODate } from '../../../utils/dates';
import {
  filterExpenses,
  periodRange,
  summarize,
  totalsByCategory,
  totalsOverTime,
  type Period,
  type ReportTab,
} from '../report';

export function useReport() {
  const [tab, setTab] = useState<ReportTab>('me');
  const [period, setPeriod] = useState<Period>({
    mode: 'month',
    anchor: toISODate(new Date()),
  });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [items, setItems] = useState<ExpenseListItem[] | null>(null);
  const [selfMemberId, setSelfMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Recarrega ao voltar para a tela, para mostrar gastos novos do chat.
  useFocusEffect(
    useCallback(() => {
      setReloadKey(key => key + 1);
    }, []),
  );

  useEffect(() => {
    let active = true;
    const { from, to } = periodRange(period);
    Promise.all([listExpensesBetween(from, to), getSelfMemberId()])
      .then(([rows, self]) => {
        if (active) {
          setItems(rows);
          setSelfMemberId(self);
          setError(null);
        }
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      active = false;
    };
  }, [period, reloadKey]);

  const report = useMemo(() => {
    if (!items) {
      return null;
    }
    const filtered = filterExpenses(items, { tab, selfMemberId, categoryIds });
    return {
      summary: summarize(filtered, period),
      byCategory: totalsByCategory(filtered),
      overTime: totalsOverTime(filtered, period),
    };
  }, [items, tab, selfMemberId, categoryIds, period]);

  const toggleCategory = useCallback((id: string) => {
    setCategoryIds(current =>
      current.includes(id) ? current.filter(c => c !== id) : [...current, id],
    );
  }, []);

  return {
    tab,
    setTab,
    period,
    setPeriod,
    categoryIds,
    toggleCategory,
    clearCategories: () => setCategoryIds([]),
    report,
    error,
  };
}
