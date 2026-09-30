import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import { colors, fonts } from '../../../theme';
import { formatDayLabel } from '../../../utils/dates';
import { formatBRL } from '../../../utils/money';
import { getCategory } from '../../expenses/categories';
import type { ChatActions } from '../hooks/useChat';
import type { ExpenseMessage } from '../types';
import { cardStyles } from './cardStyles';
import ExpenseEditForm from './ExpenseEditForm';
import SavedNotice from './SavedNotice';
import ScopeToggle from './ScopeToggle';

type Props = {
  message: ExpenseMessage;
  actions: ChatActions;
};

export default function ExpenseConfirmCard({ message, actions }: Props) {
  const { draft, status, id } = message;
  const category = getCategory(draft.categoryId);
  const saved = status === 'saved';

  if (status === 'editing') {
    return (
      <View style={cardStyles.wrapper}>
        <ExpenseEditForm
          draft={draft}
          onCancel={() => actions.cancelEdit(id)}
          onSave={edited => actions.saveEdit(id, edited)}
        />
      </View>
    );
  }

  return (
    <View style={cardStyles.wrapper}>
      <View style={cardStyles.card}>
        <Text style={cardStyles.intro}>Entendi este gasto:</Text>

        <Row label="Valor">
          <Text style={styles.amount}>{formatBRL(draft.amountCents)}</Text>
        </Row>
        <Row label="Categoria">
          <View style={styles.category}>
            <Feather name={category.icon} size={14} color={colors.text} />
            <Text style={styles.value}>{category.label}</Text>
          </View>
        </Row>
        <Row label="Data">
          <Text style={styles.value}>{formatDayLabel(draft.date)}</Text>
        </Row>
        <Row label="Tipo">
          <ScopeToggle
            value={draft.scope}
            disabled={saved}
            onChange={scope => actions.setScope(id, scope)}
          />
        </Row>

        {!saved && (
          <View style={cardStyles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={!draft.scope}
              onPress={() => actions.confirm(id)}
              style={({ pressed }) => [
                cardStyles.primaryButton,
                pressed && cardStyles.pressed,
                !draft.scope && cardStyles.disabled,
              ]}
            >
              <Feather name="check" size={16} color={colors.onPrimary} />
              <Text style={cardStyles.primaryButtonText}>Confirmar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => actions.startEdit(id)}
              style={({ pressed }) => [
                cardStyles.secondaryButton,
                pressed && cardStyles.pressed,
              ]}
            >
              <Text style={cardStyles.secondaryButtonText}>Editar</Text>
            </Pressable>
          </View>
        )}
      </View>
      {saved && <SavedNotice draft={draft} />}
    </View>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  value: {
    fontSize: 14,
    color: colors.text,
  },
  amount: {
    fontFamily: fonts.serif,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
