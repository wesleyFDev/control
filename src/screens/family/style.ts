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
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  summary: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.ink,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.onInk,
    opacity: 0.8,
  },
  summaryTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    fontWeight: '700',
    color: colors.onInk,
  },
  code: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.onInk,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  codeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onInk,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.familySoft,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.family,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
    color: colors.me,
    backgroundColor: colors.meSoft,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.text,
  },
  codeInput: {
    letterSpacing: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.me,
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
  center: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
