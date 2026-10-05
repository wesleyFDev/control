import { StyleSheet } from 'react-native';

import { colors } from '../../theme';

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
    gap: 8,
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 32,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 14,
    color: colors.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.me,
  },
  capture: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  captureText: {
    flex: 1,
    gap: 2,
  },
  captureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  captureBody: {
    fontSize: 13,
    color: colors.text,
  },
  captureMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  captureAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  verdict: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  verdictYes: {
    color: colors.primary,
  },
  verdictNo: {
    color: colors.textMuted,
  },
  secondaryButton: {
    alignItems: 'center',
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
  appRule: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: colors.text,
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
  pressed: {
    opacity: 0.7,
  },
});
