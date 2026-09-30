import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../../components/safeAreaEdges';
import { colors } from '../../../theme';
import type { DbInspectorParamList } from '../DbInspectorNavigator';
import { listTables, type TableSummary } from '../inspectorRepository';

type Props = NativeStackScreenProps<DbInspectorParamList, 'DbTables'>;

export default function TablesScreen({ navigation }: Props) {
  const [tables, setTables] = useState<TableSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTables(await listTables());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!tables) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <FlatList
        data={tables}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <Text style={styles.hint}>
            Somente leitura. Puxe para baixo para atualizar.
          </Text>
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir tabela ${item.name}`}
            onPress={() => navigation.navigate('DbTable', { table: item.name })}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Feather name="grid" size={18} color={colors.primary} />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.count}>
              {item.rowCount} {item.rowCount === 1 ? 'linha' : 'linhas'}
            </Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  separator: {
    height: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: colors.text,
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: colors.me,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
