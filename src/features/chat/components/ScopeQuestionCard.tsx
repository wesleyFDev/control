import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme';
import { formatBRL } from '../../../utils/money';
import { getCategory } from '../../expenses/categories';
import type { ChatActions } from '../hooks/useChat';
import type { ExpenseMessage } from '../types';
import { cardStyles } from './cardStyles';
import SavedNotice from './SavedNotice';
import ScopeToggle from './ScopeToggle';

type Props = {
  message: ExpenseMessage;
  actions: ChatActions;
};

/** Pergunta rápida quando só falta saber se o gasto é "meu" ou da "família". */
export default function ScopeQuestionCard({ message, actions }: Props) {
  const { draft, status, id } = message;
  const saved = status === 'saved';
  const category = getCategory(draft.categoryId);

  return (
    <View style={cardStyles.wrapper}>
      <View style={cardStyles.card}>
        <Text style={styles.text}>
          <Text style={styles.strong}>{formatBRL(draft.amountCents)}</Text> em{' '}
          {category.label}. Foi um gasto seu ou da família?
        </Text>
        <View style={styles.options}>
          <ScopeToggle
            variant="question"
            value={draft.scope}
            disabled={saved || status === 'saving'}
            onChange={scope => actions.answerScope(id, scope)}
          />
        </View>
      </View>
      {saved && <SavedNotice draft={draft} />}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  strong: {
    fontWeight: '700',
  },
  options: {
    marginTop: 12,
  },
});
