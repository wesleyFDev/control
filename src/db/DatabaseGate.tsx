import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { useDatabaseMigrations } from './migrate';
import { refreshCategoryRegistry } from './repositories/categoriesRepository';
import { ensureSeedData } from './seed';

/**
 * Só mostra o app depois que as tabelas do banco local estiverem criadas
 * e os dados iniciais (categorias e o membro "você") estiverem gravados.
 */
export default function DatabaseGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const migrations = useDatabaseMigrations();
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!migrations.success) {
      return;
    }
    ensureSeedData()
      .then(refreshCategoryRegistry)
      .then(() => setSeeded(true))
      .catch(err => {
        console.error(
          '[DatabaseGate] Falha ao gravar os dados iniciais',
          err instanceof Error ? err.stack : err,
        );
        setSeedError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [migrations.success]);

  const error = migrations.error ?? seedError;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Não foi possível abrir o banco local.</Text>
        <Text style={styles.detail}>{error.message}</Text>
      </View>
    );
  }

  if (!seeded) {
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
