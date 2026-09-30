import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { useDatabaseMigrations } from './migrate';

/** Só mostra o app depois que as tabelas do banco local estiverem criadas. */
export default function DatabaseGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { success, error } = useDatabaseMigrations();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Não foi possível abrir o banco local.</Text>
        <Text style={styles.detail}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  detail: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
