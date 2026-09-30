import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import type {
  ExpenseChanges,
  ExpenseListItem,
} from '../../../db/repositories/expensesRepository';
import type { CategoryRow, MemberRow } from '../../../db/schema';
import { colors, fonts } from '../../../theme';
import {
  addDays,
  formatDayLabel,
  toISODate,
  type ISODate,
} from '../../../utils/dates';
import { centsToInput, parseBRLInput } from '../../../utils/money';

type Props = {
  item: ExpenseListItem | null;
  categories: CategoryRow[];
  members: MemberRow[];
  onClose: () => void;
  onSave: (id: string, changes: ExpenseChanges) => Promise<void>;
};

/** "family" ou o id do membro dono do gasto pessoal. */
type Owner = 'family' | string;

function dateOptions(current: ISODate): ISODate[] {
  const now = new Date();
  const options = [toISODate(now), toISODate(addDays(now, -1))];
  return options.includes(current) ? options : [...options, current];
}

export default function ExpenseEditModal({
  item,
  categories,
  members,
  onClose,
  onSave,
}: Props) {
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [owner, setOwner] = useState<Owner>('family');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      return;
    }
    setAmountText(centsToInput(item.amountCents));
    setCategoryId(item.categoryId);
    setDate(item.date);
    setOwner(item.scope === 'family' ? 'family' : item.memberId ?? 'family');
    setDescription(item.description ?? '');
    setSaveError(null);
  }, [item]);

  const amountCents = parseBRLInput(amountText);
  const amountValid = amountCents !== null && amountCents > 0;
  const canSave = amountValid && Boolean(categoryId) && !saving;

  const save = async () => {
    if (!item || !canSave || amountCents === null) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(item.id, {
        amountCents,
        categoryId,
        date,
        scope: owner === 'family' ? 'family' : 'personal',
        memberId: owner === 'family' ? null : owner,
        description: description.trim() || null,
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={item !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar gasto</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              onPress={onClose}
            >
              <Feather name="x" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Valor</Text>
            <View
              style={[styles.amountField, !amountValid && styles.fieldError]}
            >
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
              <Text style={styles.errorText}>
                Informe um valor maior que zero.
              </Text>
            )}

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.chips}>
              {categories.map(category => {
                const selected = category.id === categoryId;
                return (
                  <Chip
                    key={category.id}
                    label={category.name}
                    icon={category.icon as FeatherIconName}
                    selected={selected}
                    onPress={() => setCategoryId(category.id)}
                  />
                );
              })}
            </View>

            <Text style={styles.label}>Data</Text>
            <View style={styles.chips}>
              {item &&
                dateOptions(item.date).map(option => (
                  <Chip
                    key={option}
                    label={formatDayLabel(option)}
                    selected={option === date}
                    onPress={() => setDate(option)}
                  />
                ))}
            </View>

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
                disabled={!canSave}
                onPress={save}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  !canSave && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
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
    fontSize: 18,
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
