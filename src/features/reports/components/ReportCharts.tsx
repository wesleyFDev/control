import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import { colors, fonts } from '../../../theme';
import { formatBRL } from '../../../utils/money';
import type { CategoryTotal, ReportSummary, TimeBucket } from '../report';

/** Cartão escuro com o total, como no layout do início. */
export function SummaryCard({
  summary,
  accent,
}: {
  summary: ReportSummary;
  accent: string;
}) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>Gasto no período</Text>
      <Text style={styles.summaryTotal}>{formatBRL(summary.totalCents)}</Text>
      <View style={styles.summaryRow}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={styles.summaryMeta}>
          {summary.count} {summary.count === 1 ? 'gasto' : 'gastos'} · média de{' '}
          {formatBRL(summary.dailyAverageCents)} por dia
        </Text>
      </View>
    </View>
  );
}

const CHART_HEIGHT = 120;

/**
 * Gráfico de barras feito só com Views: um ponto por dia no mês, ou por
 * mês no ano. Rola na horizontal quando não cabe na tela.
 */
export function TimeBarChart({
  buckets,
  color,
}: {
  buckets: TimeBucket[];
  color: string;
}) {
  const max = Math.max(...buckets.map(b => b.totalCents), 0);
  const peak = buckets.find(b => b.totalCents === max && max > 0);
  const dense = buckets.length > 12;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Ao longo do período</Text>
        {peak && (
          <Text style={styles.cardHint}>
            Maior: {formatBRL(peak.totalCents)} em {peak.label}
          </Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.bars}>
          {buckets.map((bucket, index) => {
            const height =
              max > 0
                ? Math.max(2, (bucket.totalCents / max) * CHART_HEIGHT)
                : 2;
            const showLabel = !dense || index % 5 === 0;
            return (
              <View
                key={bucket.key}
                style={[styles.barColumn, dense && styles.barColumnDense]}
                accessible
                accessibilityLabel={`${bucket.label}: ${formatBRL(
                  bucket.totalCents,
                )}`}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor:
                          bucket.totalCents > 0 ? color : colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {showLabel ? bucket.label : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/** Lista de categorias com barra proporcional ao total, da maior para a menor. */
export function CategoryBreakdown({
  totals,
  color,
}: {
  totals: CategoryTotal[];
  color: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Por categoria</Text>
      {totals.map(item => (
        <View key={item.categoryId} style={styles.categoryRow}>
          <View style={styles.categoryHeader}>
            <Feather
              name={item.icon as FeatherIconName}
              size={14}
              color={colors.text}
            />
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryShare}>
              {Math.round(item.share * 100)}%
            </Text>
            <Text style={styles.categoryTotal}>
              {formatBRL(item.totalCents)}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(2, item.share * 100)}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.ink,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.onInk,
    opacity: 0.8,
  },
  summaryTotal: {
    fontFamily: fonts.serif,
    fontSize: 32,
    fontWeight: '700',
    color: colors.onInk,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryMeta: {
    fontSize: 13,
    color: colors.onInk,
    opacity: 0.8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cardHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bars: {
    // Espaço para o rótulo da primeira e da última barra não ser cortado.
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barColumn: {
    width: 22,
    alignItems: 'center',
  },
  barColumnDense: {
    width: 10,
  },
  barTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minWidth: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    // Mais largo que a coluna estreita do modo mês: o texto fica centralizado
    // sobre a barra e não quebra "10", "25" em duas linhas.
    width: 28,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 10,
    color: colors.textMuted,
  },
  categoryRow: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  categoryShare: {
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
