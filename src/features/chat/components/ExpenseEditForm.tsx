import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import { colors } from '../../../theme';
import {
  addDays,
  formatDayLabel,
  toISODate,
  type ISODate,
} from '../../../utils/dates';
import { centsToInput, parseBRLInput } from '../../../utils/money';
import { useCategories } from '../../expenses/hooks/useCategories';
import type { ExpenseDraft } from '../../expenses/types';
import { cardStyles } from './cardStyles';
import ScopeToggle from './ScopeToggle';

type Props = {
  draft: ExpenseDraft;
  onSave: (draft: ExpenseDraft) => void;
  onCancel: () => void;
};

function dateOptions(current: ISODate): ISODate[] {
  const now = new Date();
  const options = [toISODate(now), toISODate(addDays(now, -1))];
  return options.includes(current) ? options : [...options, current];
}

export default function ExpenseEditForm({ draft, onSave, onCancel }: Props) {
  const [amountText, setAmountText] = useState(centsToInput(draft.amountCents));
  const categories = useCategories();
  const [categoryId, setCategoryId] = useState(draft.categoryId);
  const [date, setDate] = useState(draft.date);
  const [scope, setScope] = useState(draft.scope);

  const amountCents = parseBRLInput(amountText);
  const amountValid = amountCents !== null && amountCents > 0;
  const canSave = amountValid && scope !== null;

  const save = () => {
    if (!canSave || amountCents === null) {
      return;
    }
    onSave({ ...draft, amountCents, categoryId, date, scope });
  };

  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.intro}>Corrija o que precisar:</Text>

      <Text style={styles.label}>Valor</Text>
      <View style={[styles.amountField, !amountValid && styles.fieldError]}>
        <Text style={styles.currency}>R$</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          style={styles.amountInput}
          accessibilityLabel="Valor em reais"
          selectTextOnFocus
        />
      </View>
      {!amountValid && (
        <Text style={styles.errorText}>Informe um valor maior que zero.</Text>
      )}

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chips}>
        {categories.map(category => {
          const selected = category.id === categoryId;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setCategoryId(category.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Feather
                name={category.icon}
                size={13}
                color={selected ? colors.onPrimary : colors.text}
              />
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Data</Text>
      <View style={styles.chips}>
        {dateOptions(draft.date).map(option => {
          const selected = option === date;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setDate(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {formatDayLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Tipo</Text>
      <ScopeToggle value={scope} onChange={setScope} />

      <View style={cardStyles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            cardStyles.primaryButton,
            pressed && cardStyles.pressed,
            !canSave && cardStyles.disabled,
          ]}
        >
          <Text style={cardStyles.primaryButtonText}>Salvar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            cardStyles.secondaryButton,
            pressed && cardStyles.pressed,
          ]}
        >
          <Text style={cardStyles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  fieldError: {
    borderColor: colors.me,
  },
  currency: {
    fontSize: 16,
    color: colors.textMuted,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.me,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
