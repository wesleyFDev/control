import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import type { ExpenseListItem } from '../../db/repositories/expensesRepository';
import ExpenseEditModal from '../../features/expenses/components/ExpenseEditModal';
import DisputeSheet, {
  type DisputeSheetMode,
} from '../../features/familyExpenses/components/DisputeSheet';
import FamilyExpenseCard from '../../features/familyExpenses/components/FamilyExpenseCard';
import type { FamilyExpenseView } from '../../features/familyExpenses/familyExpenseView';
import {
  useFamilyExpenses,
  type FamilySyncStatus,
} from '../../features/familyExpenses/useFamilyExpenses';
import {
  isFuturePeriod,
  periodLabel,
  shiftPeriod,
  totalsByCategory,
  type Period,
} from '../../features/reports/report';
import { colors } from '../../theme';
import { formatDayLabel, toISODate } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

type DayGroup = {
  date: string;
  totalCents: number;
  items: FamilyExpenseView[];
};

type Filter = 'all' | 'disputed';

/** Agrupa por dia, mantendo a ordem do mais recente ao mais antigo. */
function groupByDay(items: FamilyExpenseView[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) {
      last.items.push(item);
      last.totalCents += item.amountCents;
    } else {
      groups.push({
        date: item.date,
        totalCents: item.amountCents,
        items: [item],
      });
    }
  }
  return groups;
}

const STATUS_TEXT: Record<FamilySyncStatus, string> = {
  synced: 'Compartilhado com a família',
  'no-family': 'Você ainda não está numa família: só neste celular',
  local: 'Sem conta conectada: só neste celular',
};

/**
 * Só os gastos de família, de todos os membros, mês a mês: total, divisão
 * por categoria e a lista por dia, com quem lançou cada um. Um membro pode
 * contestar o gasto de outro com uma mensagem; o gasto fica marcado até
 * quem contestou ou quem lançou registrar o acordo.
 */
export default function FamilyExpenses() {
  const [period, setPeriod] = useState<Period>({
    mode: 'month',
    anchor: toISODate(new Date()),
  });
  const {
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
  } = useFamilyExpenses(period);
  const [editing, setEditing] = useState<ExpenseListItem | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<{
    mode: DisputeSheetMode;
    item: FamilyExpenseView;
  } | null>(null);

  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  const disputed = items.filter(item => item.openDispute);
  const shown = filter === 'disputed' ? disputed : items;
  const byCategory = useMemo(() => totalsByCategory(items), [items]);
  const days = useMemo(() => groupByDay(shown), [shown]);

  const confirmSheet = async (message: string) => {
    if (!sheet) {
      return;
    }
    if (sheet.mode === 'open') {
      await dispute(sheet.item.id, message);
    } else if (sheet.item.openDispute) {
      await resolve(sheet.item.openDispute.id, message);
    }
    setSheet(null);
  };
  const next = shiftPeriod(period, 1);
  const canGoNext = !isFuturePeriod(next);

  const confirmDelete = (item: ExpenseListItem) =>
    Alert.alert(
      'Apagar gasto da família?',
      `${formatBRL(item.amountCents)} em ${
        item.categoryName
      }. Ele some para todos da família.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () =>
            remove(item.id).catch(err =>
              Alert.alert('Não foi possível apagar', String(err)),
            ),
        },
      ],
    );

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={sync}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.summary}>
          <View style={styles.periodRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              hitSlop={8}
              onPress={() => setPeriod(shiftPeriod(period, -1))}
              style={styles.periodButton}
            >
              <Feather name="chevron-left" size={20} color={colors.onInk} />
            </Pressable>
            <Text style={styles.periodLabel}>{periodLabel(period)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              accessibilityState={{ disabled: !canGoNext }}
              disabled={!canGoNext}
              hitSlop={8}
              onPress={() => setPeriod(next)}
              style={[styles.periodButton, !canGoNext && styles.disabled]}
            >
              <Feather name="chevron-right" size={20} color={colors.onInk} />
            </Pressable>
          </View>
          <Text style={styles.summaryValue}>{formatBRL(total)}</Text>
          <Text style={styles.summaryLabel}>
            {items.length} {items.length === 1 ? 'gasto' : 'gastos'}
            {familyName ? ` · ${familyName}` : ''}
          </Text>
          {disputed.length > 0 && (
            <View style={styles.statusRow}>
              <Feather name="flag" size={14} color={colors.onInk} />
              <Text style={styles.summaryLabel}>
                {disputed.length}{' '}
                {disputed.length === 1
                  ? 'contestação aberta'
                  : 'contestações abertas'}
              </Text>
            </View>
          )}
          <View style={styles.statusRow}>
            {syncing ? (
              <ActivityIndicator size="small" color={colors.onInk} />
            ) : (
              <Feather
                name={status === 'synced' ? 'cloud' : 'smartphone'}
                size={14}
                color={colors.onInk}
              />
            )}
            <Text style={styles.summaryLabel}>
              {syncing ? 'Sincronizando...' : STATUS_TEXT[status]}
            </Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              Nenhum gasto da família neste mês.
            </Text>
            <Text style={styles.emptyText}>
              Ao lançar um gasto, escolha "Família" para ele aparecer aqui.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Por categoria</Text>
            <View style={styles.card}>
              {byCategory.map(category => (
                <View key={category.categoryId} style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <Feather
                      name={category.icon as FeatherIconName}
                      size={16}
                      color={colors.family}
                    />
                    <Text style={styles.categoryName}>
                      {category.name} · {Math.round(category.share * 100)}%
                    </Text>
                    <Text style={styles.categoryValue}>
                      {formatBRL(category.totalCents)}
                    </Text>
                  </View>
                  <View style={styles.bar}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(2, category.share * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Gastos</Text>
            <View style={styles.chips}>
              {(
                [
                  ['all', `Todos (${items.length})`],
                  ['disputed', `Contestados (${disputed.length})`],
                ] as [Filter, string][]
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: filter === key }}
                  onPress={() => setFilter(key)}
                  style={[styles.chip, filter === key && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filter === key && styles.chipTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {days.length === 0 && (
              <Text style={styles.emptyText}>
                Nenhum gasto contestado neste mês.
              </Text>
            )}
            {days.map(day => (
              <View key={day.date}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>
                    {formatDayLabel(day.date)}
                  </Text>
                  <Text style={styles.dayTotal}>
                    {formatBRL(day.totalCents)}
                  </Text>
                </View>
                {day.items.map(item => (
                  <View key={item.id} style={styles.item}>
                    <FamilyExpenseCard
                      item={item}
                      onEdit={setEditing}
                      onDelete={confirmDelete}
                      onDispute={target =>
                        setSheet({ mode: 'open', item: target })
                      }
                      onResolve={target =>
                        setSheet({ mode: 'resolve', item: target })
                      }
                    />
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <ExpenseEditModal
        item={editing}
        categories={categories}
        members={members}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <DisputeSheet
        mode={sheet?.mode ?? 'open'}
        item={sheet?.item ?? null}
        onCancel={() => setSheet(null)}
        onConfirm={confirmSheet}
      />
    </SafeAreaView>
  );
}
