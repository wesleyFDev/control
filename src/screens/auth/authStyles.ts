import { StyleSheet } from 'react-native';

import { colors, fonts } from '../../theme';

/** Estilos comuns às telas de entrar e de criar conta. */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  error: {
    fontSize: 13,
    color: colors.me,
  },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
