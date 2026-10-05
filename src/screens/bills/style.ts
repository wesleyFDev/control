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
  summary: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.ink,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.onInk,
    opacity: 0.8,
  },
  summaryValue: {
    fontFamily: fonts.serif,
    fontSize: 28,
    fontWeight: '700',
    color: colors.onInk,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
  },
  badgePaid: {
    color: colors.family,
    backgroundColor: colors.familySoft,
  },
  badgeOpen: {
    color: colors.me,
    backgroundColor: colors.meSoft,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.me,
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  inputSpaced: {
    marginTop: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    fontWeight: '600',
    color: colors.onPrimary,
  },
  preview: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.primary,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  error: {
    marginTop: 10,
    fontSize: 13,
    color: colors.me,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
