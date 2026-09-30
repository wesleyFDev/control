import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import type { ExpenseListItem } from '../../../db/repositories/expensesRepository';
import { colors, fonts } from '../../../theme';
import { formatBRL } from '../../../utils/money';

type Props = {
  item: ExpenseListItem;
  onEdit: (item: ExpenseListItem) => void;
  onDelete: (item: ExpenseListItem) => void;
};

export default function ExpenseHistoryItem({ item, onEdit, onDelete }: Props) {
  const isFamily = item.scope === 'family';
  const owner = isFamily ? 'Família' : item.memberName ?? 'Pessoal';

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Feather
          name={item.categoryIcon as FeatherIconName}
          size={18}
          color={colors.primary}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>
          {item.categoryName}
        </Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <View
          style={[styles.owner, isFamily ? styles.ownerFamily : styles.ownerMe]}
        >
          <Text
            style={[
              styles.ownerText,
              { color: isFamily ? colors.family : colors.me },
            ]}
          >
            {owner}
          </Text>
        </View>
      </View>

      <View style={styles.side}>
        <Text style={styles.amount}>{formatBRL(item.amountCents)}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar gasto de ${item.categoryName}`}
            hitSlop={8}
            onPress={() => onEdit(item)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Feather name="edit-2" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Apagar gasto de ${item.categoryName}`}
            hitSlop={8}
            onPress={() => onDelete(item)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Feather name="trash-2" size={16} color={colors.me} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  category: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
  },
  owner: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ownerFamily: {
    backgroundColor: colors.familySoft,
  },
  ownerMe: {
    backgroundColor: colors.meSoft,
  },
  ownerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  side: {
    alignItems: 'flex-end',
    gap: 8,
  },
  amount: {
    fontFamily: fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
  },
  action: {
    padding: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
