import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme';

type Props = {
  text: string;
  from: 'user' | 'assistant';
};

export default function MessageBubble({ text, from }: Props) {
  const isUser = from === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
      <Text style={[styles.text, isUser && styles.userText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.ink,
    borderBottomRightRadius: 4,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  userText: {
    color: colors.onInk,
  },
});
