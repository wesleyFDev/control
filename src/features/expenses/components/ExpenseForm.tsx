import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import { parseDate } from '../../../ai/parsers/dateParser';
import type { ExpenseChanges } from '../../../db/repositories/expensesRepository';
import type { CategoryRow, MemberRow } from '../../../db/schema';
import { colors } from '../../../theme';
import {
  addDays,
  formatDayLabel,
  toISODate,
  type ISODate,
} from '../../../utils/dates';
import { centsToInput, parseBRLInput } from '../../../utils/money';

/** "family" ou o id do membro dono do gasto pessoal. */
export type ExpenseOwner = 'family' | string;

export type ExpenseFormValues = {
  amountCents: number | null;
  categoryId: string | null;
  date: ISODate;
  owner: ExpenseOwner;
  description: string;
};

type Props = {
  initialValues: ExpenseFormValues;
  categories: CategoryRow[];
  members: MemberRow[];
  submitLabel: string;
  onSubmit: (changes: ExpenseChanges) => Promise<void>;
  onCancel?: () => void;
};

/** Hoje, ontem e anteontem, mais a data atual do gasto se for outra. */
function quickDates(current: ISODate): ISODate[] {
  const now = new Date();
  const options = [0, -1, -2].map(offset => toISODate(addDays(now, offset)));
  return options.includes(current) ? options : [...options, current];
}

/** Aceita "15/09" ou "15/09/2026". Datas futuras sem ano voltam um ano. */
function parseTypedDate(text: string): ISODate | null {
  if (!/^\s*\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/.test(text)) {
    return null;
  }
  const result = parseDate(text);
  return result.found ? result.date : null;
}

export default function ExpenseForm({
  initialValues,
  categories,
  members,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [amountText, setAmountText] = useState(
    initialValues.amountCents ? centsToInput(initialValues.amountCents) : '',
  );
  const [categoryId, setCategoryId] = useState(initialValues.categoryId);
  const [date, setDate] = useState(initialValues.date);
  const [typedDate, setTypedDate] = useState('');
  const [owner, setOwner] = useState<ExpenseOwner>(initialValues.owner);
  const [description, setDescription] = useState(initialValues.description);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const amountCents = parseBRLInput(amountText);
  const amountValid = amountCents !== null && amountCents > 0;
  const typedDateValue = typedDate ? parseTypedDate(typedDate) : null;
  const typedDateInvalid = typedDate.length > 0 && typedDateValue === null;
  const finalDate = typedDateValue ?? date;
  const valid = amountValid && categoryId !== null && !typedDateInvalid;

  const submit = async () => {
    setSubmitted(true);
    if (!valid || amountCents === null || categoryId === null || saving) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        amountCents,
        categoryId,
        date: finalDate,
        scope: owner === 'family' ? 'family' : 'personal',
        memberId: owner === 'family' ? null : owner,
        description: description.trim() || null,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>Valor</Text>
      <View
        style={[
          styles.amountField,
          submitted && !amountValid && styles.fieldError,
        ]}
      >
        <Text style={styles.currency}>R$</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.amountInput}
          accessibilityLabel="Valor em reais"
          selectTextOnFocus
        />
      </View>
      {submitted && !amountValid && (
        <Text style={styles.errorText}>Informe um valor maior que zero.</Text>
      )}

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chips}>
        {categories.map(category => (
          <Chip
            key={category.id}
            label={category.name}
            icon={category.icon as FeatherIconName}
            selected={category.id === categoryId}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>
      {submitted && categoryId === null && (
        <Text style={styles.errorText}>Escolha uma categoria.</Text>
      )}

      <Text style={styles.label}>Data</Text>
      <View style={styles.chips}>
        {quickDates(initialValues.date).map(option => (
          <Chip
            key={option}
            label={formatDayLabel(option)}
            selected={!typedDateValue && option === date}
            onPress={() => {
              setDate(option);
              setTypedDate('');
            }}
          />
        ))}
      </View>
      <TextInput
        value={typedDate}
        onChangeText={setTypedDate}
        placeholder="Outra data: dd/mm ou dd/mm/aaaa"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        style={[
          styles.textInput,
          styles.dateInput,
          submitted && typedDateInvalid && styles.fieldError,
        ]}
        accessibilityLabel="Outra data"
        maxLength={10}
      />
      {submitted && typedDateInvalid && (
        <Text style={styles.errorText}>Data inválida. Use dd/mm/aaaa.</Text>
      )}

      <Text style={styles.label}>De quem é</Text>
      <View style={styles.chips}>
        <Chip
          label="Família"
          selected={owner === 'family'}
          onPress={() => setOwner('family')}
        />
        {members.map(member => (
          <Chip
            key={member.id}
            label={member.isSelf ? `${member.name} (você)` : member.name}
            selected={owner === member.id}
            onPress={() => setOwner(member.id)}
          />
        ))}
      </View>

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Opcional"
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        accessibilityLabel="Descrição"
        maxLength={120}
      />

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={submit}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Salvando...' : submitLabel}
          </Text>
        </Pressable>
        {onCancel && (
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: FeatherIconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && (
        <Feather
          name={icon}
          size={13}
          color={selected ? colors.onPrimary : colors.text}
        />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 14,
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
    backgroundColor: colors.surface,
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
    fontSize: 20,
    color: colors.text,
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  dateInput: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 6,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
