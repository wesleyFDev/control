import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  ExpenseChanges,
  ExpenseListItem,
} from '../../../db/repositories/expensesRepository';
import type { CategoryRow, MemberRow } from '../../../db/schema';
import { colors, fonts } from '../../../theme';
import ExpenseForm from './ExpenseForm';

type Props = {
  item: ExpenseListItem | null;
  categories: CategoryRow[];
  members: MemberRow[];
  onClose: () => void;
  onSave: (id: string, changes: ExpenseChanges) => Promise<void>;
};

export default function ExpenseEditModal({
  item,
  categories,
  members,
  onClose,
  onSave,
}: Props) {
  return (
    <Modal
      visible={item !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* O Modal fica fora da árvore de telas: protege a borda de baixo aqui. */}
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar gasto</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              onPress={onClose}
            >
              <Feather name="x" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {item && (
              <ExpenseForm
                key={item.id}
                initialValues={{
                  amountCents: item.amountCents,
                  categoryId: item.categoryId,
                  date: item.date,
                  owner:
                    item.scope === 'family'
                      ? 'family'
                      : item.memberId ?? 'family',
                  description: item.description ?? '',
                }}
                categories={categories}
                members={members}
                submitLabel="Salvar"
                onSubmit={async changes => {
                  await onSave(item.id, changes);
                  onClose();
                }}
                onCancel={onClose}
              />
            )}
          </ScrollView>
        </SafeAreaView>
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
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
