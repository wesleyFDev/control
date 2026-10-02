import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import { colors, fonts } from '../../../theme';
import type { Category } from '../../expenses/categories';
import {
  isFuturePeriod,
  periodLabel,
  shiftPeriod,
  type Period,
  type ReportTab,
} from '../report';

/** Abas "Meus" e "Família". */
export function ReportTabs({
  value,
  onChange,
}: {
  value: ReportTab;
  onChange: (tab: ReportTab) => void;
}) {
  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'me', label: 'Meus' },
    { key: 'family', label: 'Família' },
  ];
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {tabs.map(tab => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Mês ou ano, com setas para navegar. */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  const nextDisabled = isFuturePeriod(shiftPeriod(value, 1));
  return (
    <View style={styles.period}>
      <View style={styles.modes}>
        {(['month', 'year'] as const).map(mode => {
          const selected = value.mode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange({ ...value, mode })}
              style={[styles.mode, selected && styles.modeSelected]}
            >
              <Text
                style={[styles.modeText, selected && styles.modeTextSelected]}
              >
                {mode === 'month' ? 'Mês' : 'Ano'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.navigator}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Período anterior"
          hitSlop={10}
          onPress={() => onChange(shiftPeriod(value, -1))}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.periodLabel}>{periodLabel(value)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo período"
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
          hitSlop={10}
          onPress={() => onChange(shiftPeriod(value, 1))}
          style={nextDisabled && styles.disabled}
        >
          <Feather name="chevron-right" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

/** Filtro de categorias. Nenhuma marcada mostra todas. */
export function CategoryFilter({
  categories,
  selected,
  onToggle,
  onClear,
}: {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const all = selected.length === 0;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      <Chip label="Todas" selected={all} onPress={onClear} />
      {categories.map(category => (
        <Chip
          key={category.id}
          label={category.label}
          icon={category.icon}
          selected={selected.includes(category.id)}
          onPress={() => onToggle(category.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: FeatherIconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && (
        <Feather
          name={icon}
          size={13}
          color={selected ? colors.onPrimary : colors.text}
        />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabSelected: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tabTextSelected: {
    fontWeight: '700',
    color: colors.text,
  },
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modes: {
    flexDirection: 'row',
    gap: 6,
  },
  mode: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  modeText: {
    fontSize: 13,
    color: colors.text,
  },
  modeTextSelected: {
    color: colors.onInk,
    fontWeight: '600',
  },
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodLabel: {
    minWidth: 120,
    textAlign: 'center',
    fontFamily: fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  disabled: {
    opacity: 0.3,
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
