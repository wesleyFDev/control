import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../../components/safeAreaEdges';
import { colors } from '../../../theme';
import type { DbInspectorParamList } from '../DbInspectorNavigator';
import {
  formatCell,
  getColumns,
  getRows,
  type CellValue,
  type ColumnInfo,
} from '../inspectorRepository';

type Props = NativeStackScreenProps<DbInspectorParamList, 'DbTable'>;

const PAGE_SIZE = 50;
const CHAR_WIDTH = 8;
const MIN_WIDTH = 72;
const MAX_WIDTH = 240;

/** Largura de cada coluna pelo nome e pelos primeiros valores, com limite. */
function columnWidths(columns: ColumnInfo[], rows: CellValue[][]): number[] {
  return columns.map((column, index) => {
    const sample = rows.slice(0, 20).map(row => formatCell(row[index]).length);
    const chars = Math.max(column.name.length + 2, ...sample);
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, chars * CHAR_WIDTH + 20));
  });
}

export default function TableScreen({ route }: Props) {
  const { table } = route.params;
  const [columns, setColumns] = useState<ColumnInfo[] | null>(null);
  const [rows, setRows] = useState<CellValue[][]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CellValue[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cols = await getColumns(table);
        const firstPage = await getRows(table, cols, PAGE_SIZE, 0);
        if (active) {
          setColumns(cols);
          setRows(firstPage);
          setHasMore(firstPage.length === PAGE_SIZE);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [table]);

  const loadMore = useCallback(async () => {
    if (!columns || !hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await getRows(table, columns, PAGE_SIZE, rows.length);
      setRows(current => [...current, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMore(false);
    }
  }, [columns, hasMore, loadingMore, rows.length, table]);

  const widths = useMemo(
    () => (columns ? columnWidths(columns, rows) : []),
    [columns, rows],
  );

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!columns) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const totalWidth = widths.reduce((sum, width) => sum + width, 0);

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <Text style={styles.summary}>
        {columns.length} colunas · {rows.length}
        {hasMore ? '+' : ''} linhas carregadas · toque numa linha para ver tudo
      </Text>
      <ScrollView horizontal bounces={false} style={styles.horizontal}>
        <View style={[styles.table, { width: totalWidth }]}>
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((column, index) => (
              <View
                key={column.name}
                style={[styles.cell, { width: widths[index] }]}
              >
                <Text style={styles.headerText} numberOfLines={1}>
                  {column.primaryKey ? 'PK · ' : ''}
                  {column.name}
                </Text>
                <Text style={styles.typeText} numberOfLines={1}>
                  {column.type || 'ANY'}
                  {column.notNull ? ' · NOT NULL' : ''}
                </Text>
              </View>
            ))}
          </View>

          <FlatList
            style={styles.rows}
            data={rows}
            keyExtractor={(_, index) => String(index)}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={<Text style={styles.empty}>Tabela vazia.</Text>}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  style={styles.footer}
                  color={colors.primary}
                />
              ) : undefined
            }
            renderItem={({ item, index: rowIndex }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Linha ${rowIndex + 1}`}
                onPress={() => setSelected(item)}
                style={({ pressed }) => [
                  styles.row,
                  rowIndex % 2 === 1 && styles.rowAlt,
                  pressed && styles.pressed,
                ]}
              >
                {item.map((value, index) => (
                  <View
                    key={columns[index].name}
                    style={[styles.cell, { width: widths[index] }]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        value === null && styles.nullText,
                      ]}
                      numberOfLines={1}
                    >
                      {formatCell(value)}
                    </Text>
                  </View>
                ))}
              </Pressable>
            )}
          />
        </View>
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Linha completa</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={12}
                onPress={() => setSelected(null)}
              >
                <Feather name="x" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              {selected?.map((value, index) => (
                <View key={columns[index].name} style={styles.field}>
                  <Text style={styles.fieldName}>{columns[index].name}</Text>
                  <Text
                    style={[
                      styles.fieldValue,
                      value === null && styles.nullText,
                    ]}
                    selectable
                  >
                    {formatCell(value)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
  horizontal: {
    flex: 1,
  },
  table: {
    flex: 1,
  },
  rows: {
    flex: 1,
  },
  summary: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowAlt: {
    backgroundColor: colors.surfaceMuted,
  },
  headerRow: {
    backgroundColor: colors.primarySoft,
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.primary,
  },
  typeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cellText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.text,
  },
  nullText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  empty: {
    padding: 16,
    fontSize: 13,
    color: colors.textMuted,
  },
  footer: {
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.me,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '80%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  field: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fieldName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.primary,
  },
  fieldValue: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.text,
  },
});
