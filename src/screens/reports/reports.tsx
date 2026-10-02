import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { useCategories } from '../../features/expenses/hooks/useCategories';
import {
  CategoryBreakdown,
  SummaryCard,
  TimeBarChart,
} from '../../features/reports/components/ReportCharts';
import {
  CategoryFilter,
  PeriodPicker,
  ReportTabs,
} from '../../features/reports/components/ReportControls';
import { useReport } from '../../features/reports/hooks/useReport';
import { colors } from '../../theme';
import { styles } from './style';

export default function Reports() {
  const categories = useCategories();
  const {
    tab,
    setTab,
    period,
    setPeriod,
    categoryIds,
    toggleCategory,
    clearCategories,
    report,
    error,
  } = useReport();

  // Laranja para os seus gastos e verde para os da família, como no chat.
  const accent = tab === 'me' ? colors.me : colors.family;

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        <ReportTabs value={tab} onChange={setTab} />
        <PeriodPicker value={period} onChange={setPeriod} />
        <CategoryFilter
          categories={categories}
          selected={categoryIds}
          onToggle={toggleCategory}
          onClear={clearCategories}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        {!report && !error && (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        )}

        {report && (
          <>
            <SummaryCard summary={report.summary} accent={accent} />
            {report.summary.count === 0 ? (
              <View style={styles.empty}>
                <Feather
                  name="bar-chart-2"
                  size={28}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  {tab === 'me'
                    ? 'Nenhum gasto seu neste período.'
                    : 'Nenhum gasto da família neste período.'}
                </Text>
              </View>
            ) : (
              <>
                <TimeBarChart buckets={report.overTime} color={accent} />
                <CategoryBreakdown totals={report.byCategory} color={accent} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
