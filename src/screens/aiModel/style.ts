import { StyleSheet } from 'react-native';

import { colors, fonts } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  danger: {
    color: colors.me,
  },
  pressed: {
    opacity: 0.7,
  },
});
