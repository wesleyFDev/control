import { StyleSheet } from 'react-native';

import { colors, fonts } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  contentWithBar: {
    paddingBottom: 110,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    rowGap: 8,
  },
  summaryCell: {
    width: '50%',
    gap: 2,
  },
  summaryCellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onInk,
  },
  limitBar: {
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  limitBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.me,
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
  amountIn: {
    color: colors.family,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDone: {
    color: colors.family,
    backgroundColor: colors.familySoft,
  },
  badgePending: {
    color: colors.me,
    backgroundColor: colors.meSoft,
  },
  badgeMuted: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxSpacer: {
    width: 22,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.primary,
  },
  error: {
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
  // Folha de passar para os gastos.
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '85%',
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.background,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  sheetTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 14,
    color: colors.text,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  flex: {
    flex: 1,
  },
});
