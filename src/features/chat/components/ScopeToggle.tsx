import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme';
import { SCOPE_LABELS, type ExpenseScope } from '../../expenses/types';

type Props = {
  value: ExpenseScope | null;
  onChange: (scope: ExpenseScope) => void;
  disabled?: boolean;
  /**
   * "compact": pílulas pequenas do cartão de confirmação.
   * "question": botões coloridos da pergunta "seu ou da família?".
   */
  variant?: 'compact' | 'question';
};

const SCOPES: ExpenseScope[] = ['me', 'family'];

export default function ScopeToggle({
  value,
  onChange,
  disabled = false,
  variant = 'compact',
}: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {SCOPES.map(scope => {
        const selected = value === scope;
        const chipStyle =
          variant === 'question'
            ? [
                styles.question,
                scope === 'me' ? styles.questionMe : styles.questionFamily,
                selected && styles.questionSelected,
                disabled && !selected && styles.faded,
              ]
            : [
                styles.compact,
                selected && styles.compactSelected,
                disabled && !selected && styles.faded,
              ];
        const textStyle =
          variant === 'question'
            ? [
                styles.questionText,
                { color: scope === 'me' ? colors.me : colors.family },
              ]
            : [styles.compactText, selected && styles.compactTextSelected];

        return (
          <Pressable
            key={scope}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(scope)}
            style={({ pressed }) => [chipStyle, pressed && styles.pressed]}
          >
            <Text style={textStyle}>{SCOPE_LABELS[scope]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  compact: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  compactSelected: {
    backgroundColor: colors.family,
    borderColor: colors.family,
  },
  compactText: {
    fontSize: 13,
    color: colors.text,
  },
  compactTextSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  question: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  questionMe: {
    borderColor: colors.me,
    backgroundColor: colors.meSoft,
  },
  questionFamily: {
    borderColor: colors.family,
    backgroundColor: colors.familySoft,
  },
  questionSelected: {
    borderWidth: 2.5,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  faded: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
