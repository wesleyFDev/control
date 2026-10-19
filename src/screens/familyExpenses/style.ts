import { StyleSheet } from 'react-native';

import { colors, fonts } from '../../theme';

export const styles = StyleSheet.create({
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
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  summary: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.ink,
    gap: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodButton: {
    padding: 6,
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onInk,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.onInk,
    opacity: 0.8,
  },
  summaryValue: {
    marginTop: 6,
    fontFamily: fonts.serif,
    fontSize: 32,
    fontWeight: '700',
    color: colors.onInk,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sectionTitle: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
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
  categoryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.family,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dayTotal: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
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
    fontWeight: '600',
    color: colors.onPrimary,
  },
  item: {
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    color: colors.me,
  },
  disabled: {
    opacity: 0.3,
  },
});
