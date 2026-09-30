import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import { colors } from '../../../theme';
import { formatBRL } from '../../../utils/money';
import { getCategory } from '../../expenses/categories';
import type { ExpenseDraft } from '../../expenses/types';

export default function SavedNotice({ draft }: { draft: ExpenseDraft }) {
  const category = getCategory(draft.categoryId);
  const scope = draft.scope === 'me' ? 'meu' : 'família';

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Feather name="check" size={13} color={colors.textMuted} />
      <Text style={styles.text}>
        Salvo: {formatBRL(draft.amountCents)} em {category.label}, {scope}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
