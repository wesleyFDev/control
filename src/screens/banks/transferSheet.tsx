import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BankTransaction } from '../../db/repositories/pluggyRepository';
import { matchCategory } from '../../ai/parsers/categoryMatcher';
import { DEFAULT_CATEGORY_ID } from '../../features/expenses/categories';
import { useCategories } from '../../features/expenses/hooks/useCategories';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

export type TransferDraft = {
  transactionId: string;
  description: string;
  categoryId: string;
};

type Props = {
  transactions: BankTransaction[];
  visible: boolean;
  onCancel: () => void;
  onConfirm: (
    scope: 'personal' | 'family',
    drafts: TransferDraft[],
  ) => Promise<void>;
};

/**
 * Folha para passar transações do banco para os gastos. Aproveita o valor,
 * a data e a descrição do banco; o usuário escolhe se o gasto é dele ou da
 * família e pode ajustar a descrição e a categoria de cada um.
 */
export default function TransferSheet({
  transactions,
  visible,
  onCancel,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const [scope, setScope] = useState<'personal' | 'family'>('personal');
  const [drafts, setDrafts] = useState<TransferDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Sugere a categoria pelas palavras-chave a cada vez que a folha abre.
  useEffect(() => {
    if (visible) {
      setDrafts(
        transactions.map(t => ({
          transactionId: t.id,
          description: t.description,
          categoryId: matchCategory(t.description) ?? DEFAULT_CATEGORY_ID,
        })),
      );
      setSaving(false);
    }
  }, [visible, transactions]);

  const change = (id: string, patch: Partial<TransferDraft>) =>
    setDrafts(list =>
      list.map(d => (d.transactionId === id ? { ...d, ...patch } : d)),
    );

  const total = transactions.reduce(
    (sum, t) => sum + Math.abs(t.amountCents),
    0,
  );

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(scope, drafts);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityLabel="Fechar"
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom }]}
          onPress={() => undefined}
        >
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Passar para os gastos</Text>
            <Text style={styles.hint}>
              {transactions.length}{' '}
              {transactions.length === 1 ? 'transação' : 'transações'} ·{' '}
              {formatBRL(total)}
            </Text>

            <Text style={styles.label}>De quem é o gasto</Text>
            <View style={styles.tabs} accessibilityRole="radiogroup">
              {(
                [
                  ['personal', 'Meu'],
                  ['family', 'Família'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: scope === key }}
                  onPress={() => setScope(key)}
                  style={[styles.tab, scope === key && styles.tabSelected]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      scope === key && styles.tabTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {drafts.map(draft => {
              const transaction = transactions.find(
                t => t.id === draft.transactionId,
              );
              if (!transaction) {
                return null;
              }
              return (
                <View key={draft.transactionId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.meta, styles.flex]}>
                      {formatDayLabel(transaction.date)} ·{' '}
                      {transaction.description}
                    </Text>
                    <Text style={styles.amount}>
                      {formatBRL(Math.abs(transaction.amountCents))}
                    </Text>
                  </View>
                  <TextInput
                    value={draft.description}
                    onChangeText={description =>
                      change(draft.transactionId, { description })
                    }
                    placeholder="Descrição"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    accessibilityLabel="Descrição do gasto"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                  >
                    {categories.map(category => {
                      const selected = draft.categoryId === category.id;
                      return (
                        <Pressable
                          key={category.id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() =>
                            change(draft.transactionId, {
                              categoryId: category.id,
                            })
                          }
                          style={[styles.chip, selected && styles.chipSelected]}
                        >
                          <Feather
                            name={category.icon}
                            size={13}
                            color={selected ? colors.onPrimary : colors.text}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              selected && styles.chipTextSelected,
                            ]}
                          >
                            {category.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.flex,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving || drafts.length === 0}
              onPress={confirm}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.flex,
                saving && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {saving && <ActivityIndicator color={colors.onPrimary} />}
              <Text style={styles.primaryButtonText}>Passar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
