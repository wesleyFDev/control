import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../../../theme';
import { formatBRL } from '../../../utils/money';
import type { FamilyExpenseView } from '../familyExpenseView';

const MAX_LENGTH = 500;

export type DisputeSheetMode = 'open' | 'resolve';

type Props = {
  mode: DisputeSheetMode;
  item: FamilyExpenseView | null;
  onCancel: () => void;
  /** Recebe o motivo (ao contestar) ou o que foi combinado (ao encerrar). */
  onConfirm: (message: string) => Promise<void>;
};

const TEXT = {
  open: {
    title: 'Contestar gasto',
    label: 'Por que você está contestando?',
    placeholder: 'Ex.: essa compra foi pessoal, não da casa',
    confirm: 'Contestar',
  },
  resolve: {
    title: 'Encerrar contestação',
    label: 'O que vocês combinaram?',
    placeholder: 'Ex.: corrigi o valor / era da família mesmo',
    confirm: 'Encerrar',
  },
};

/** Folha com a mensagem obrigatória para contestar ou encerrar. */
export default function DisputeSheet({
  mode,
  item,
  onCancel,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = TEXT[mode];

  useEffect(() => {
    if (item) {
      setMessage('');
      setError(null);
      setSaving(false);
    }
  }, [item]);

  const canConfirm = message.trim().length > 0 && !saving;

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.flex}
          onPress={onCancel}
          accessibilityLabel="Fechar"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.title}>{text.title}</Text>
          {item && (
            <Text style={styles.meta}>
              {item.categoryName}
              {item.description ? ` · ${item.description}` : ''} ·{' '}
              {formatBRL(item.amountCents)} · lançado por {item.createdByName}
            </Text>
          )}
          {mode === 'resolve' && item?.openDispute && (
            <Text style={styles.reason}>
              {item.openDispute.openedByName} contestou: "
              {item.openDispute.reason}"
            </Text>
          )}
          <Text style={styles.label}>{text.label}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={text.placeholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={MAX_LENGTH}
            autoFocus
            accessibilityLabel={text.label}
          />
          <Text style={styles.counter}>
            {message.length}/{MAX_LENGTH}
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canConfirm}
              onPress={confirm}
              style={({ pressed }) => [
                styles.primaryButton,
                mode === 'open' && styles.dangerButton,
                !canConfirm && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {saving && <ActivityIndicator color={colors.onPrimary} />}
              <Text style={styles.primaryText}>{text.confirm}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  flex: {
    flex: 1,
  },
  sheet: {
    gap: 8,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  reason: {
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    backgroundColor: colors.meSoft,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.me,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  dangerButton: {
    backgroundColor: colors.me,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
