import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import type { ExpenseListItem } from '../../db/repositories/expensesRepository';
import ExpenseEditModal from '../../features/expenses/components/ExpenseEditModal';
import ExpenseHistoryItem from '../../features/expenses/components/ExpenseHistoryItem';
import { useExpenseHistory } from '../../features/expenses/hooks/useExpenseHistory';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

type Section = {
  date: string;
  totalCents: number;
  data: ExpenseListItem[];
};

/** Agrupa os gastos por dia, mantendo a ordem do mais recente ao mais antigo. */
function groupByDay(items: ExpenseListItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.date === item.date) {
      last.data.push(item);
      last.totalCents += item.amountCents;
    } else {
      sections.push({
        date: item.date,
        totalCents: item.amountCents,
        data: [item],
      });
    }
  }
  return sections;
}

export default function Details() {
  const { items, categories, members, loading, error, remove, save } =
    useExpenseHistory();
  const [editing, setEditing] = useState<ExpenseListItem | null>(null);
  const sections = useMemo(() => groupByDay(items), [items]);

  const confirmDelete = (item: ExpenseListItem) => {
    Alert.alert(
      'Apagar gasto?',
      `${formatBRL(item.amountCents)} em ${
        item.categoryName
      }. Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            remove(item.id).catch(err =>
              Alert.alert('Não foi possível apagar', String(err)),
            );
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          Não foi possível carregar os gastos.
        </Text>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyList : styles.list
        }
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {formatDayLabel(section.date)}
            </Text>
            <Text style={styles.sectionTotal}>
              {formatBRL(section.totalCents)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ExpenseHistoryItem
            item={item}
            onEdit={setEditing}
            onDelete={confirmDelete}
          />
        )}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={EmptyHistory}
      />

      <ExpenseEditModal
        item={editing}
        categories={categories}
        members={members}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

function EmptyHistory() {
  return (
    <View style={styles.empty}>
      <Feather name="inbox" size={32} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>Nenhum gasto registrado ainda.</Text>
      <Text style={styles.emptyText}>
        Os gastos salvos pelo chat ou digitados aparecem aqui.
      </Text>
    </View>
  );
}
