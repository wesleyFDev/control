import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import type { ExpenseListItem } from '../../../db/repositories/expensesRepository';
import { colors } from '../../../theme';
import ExpenseHistoryItem from '../../expenses/components/ExpenseHistoryItem';
import type { FamilyExpenseView } from '../familyExpenseView';

type Props = {
  item: FamilyExpenseView;
  onEdit: (item: ExpenseListItem) => void;
  onDelete: (item: ExpenseListItem) => void;
  onDispute: (item: FamilyExpenseView) => void;
  onResolve: (item: FamilyExpenseView) => void;
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Gasto de família com quem lançou e, quando houver, a contestação: quem
 * contestou, o motivo e o que foi combinado ao encerrar.
 */
export default function FamilyExpenseCard({
  item,
  onEdit,
  onDelete,
  onDispute,
  onResolve,
}: Props) {
  const dispute = item.openDispute;

  return (
    <View style={[styles.wrapper, dispute && styles.wrapperFlagged]}>
      <ExpenseHistoryItem item={item} onEdit={onEdit} onDelete={onDelete} />

      <View style={styles.footer}>
        <Feather name="user" size={13} color={colors.textMuted} />
        <Text style={styles.meta}>Lançado por {item.createdByName}</Text>
        {item.canDispute && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Contestar gasto de ${item.categoryName}`}
            hitSlop={8}
            onPress={() => onDispute(item)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Feather name="flag" size={13} color={colors.me} />
            <Text style={styles.actionText}>Contestar</Text>
          </Pressable>
        )}
      </View>

      {dispute && (
        <View style={styles.flag}>
          <View style={styles.flagHeader}>
            <Feather name="flag" size={14} color={colors.me} />
            <Text style={styles.flagTitle}>
              Contestado por {dispute.openedByName}
            </Text>
          </View>
          <Text style={styles.flagReason}>"{dispute.reason}"</Text>
          {item.canResolve ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Encerrar contestação"
              onPress={() => onResolve(item)}
              style={({ pressed }) => [
                styles.resolveButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="check" size={14} color={colors.onPrimary} />
              <Text style={styles.resolveText}>Chegamos a um acordo</Text>
            </Pressable>
          ) : (
            <Text style={styles.meta}>
              Aguardando {dispute.openedByName} e {item.createdByName} chegarem
              a um acordo.
            </Text>
          )}
        </View>
      )}

      {!dispute && item.lastResolved && (
        <View style={styles.resolved}>
          <Feather name="check-circle" size={13} color={colors.family} />
          <Text style={styles.resolvedText}>
            Contestação encerrada por {item.lastResolved.resolvedByName}
            {item.lastResolved.resolutionNote
              ? `: "${item.lastResolved.resolutionNote}"`
              : ''}
            {'\n'}
            {capitalize(item.lastResolved.openedByName)} contestou: "
            {item.lastResolved.reason}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  wrapperFlagged: {
    paddingBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.me,
  },
  flag: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.me,
    backgroundColor: colors.meSoft,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.me,
  },
  flagReason: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  resolveText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  resolved: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
  },
  resolvedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
