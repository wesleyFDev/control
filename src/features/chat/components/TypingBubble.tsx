import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme';

/** Mostrado enquanto a IA escolhe a categoria do gasto. */
export default function TypingBubble() {
  return (
    <View style={styles.bubble} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.text}>Pensando na categoria...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  text: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
