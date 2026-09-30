import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';

import { createExpense } from '../../db/repositories/expensesRepository';
import ExpenseForm, {
  type ExpenseFormValues,
} from '../../features/expenses/components/ExpenseForm';
import { useExpenseLookups } from '../../features/expenses/hooks/useExpenseLookups';
import { colors } from '../../theme';
import { toISODate } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

type Saved = { amountCents: number; categoryName: string };

export default function NewExpense() {
  const navigation = useNavigation();
  const { categories, members, loading, error } = useExpenseLookups();
  // Trocar a chave recria o formulário vazio depois de salvar.
  const [formKey, setFormKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<Saved | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <Text style={styles.errorTitle}>
          Não foi possível carregar o formulário.
        </Text>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const self = members.find(member => member.isSelf);
  const initialValues: ExpenseFormValues = {
    amountCents: null,
    categoryId: null,
    date: toISODate(new Date()),
    owner: self?.id ?? 'family',
    description: '',
  };

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {lastSaved && (
            <View style={styles.banner} accessibilityLiveRegion="polite">
              <Feather name="check-circle" size={18} color={colors.primary} />
              <Text style={styles.bannerText}>
                Salvo: {formatBRL(lastSaved.amountCents)} em{' '}
                {lastSaved.categoryName}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  navigation.navigate('App', { screen: 'Details' })
                }
                hitSlop={8}
              >
                <Text style={styles.bannerLink}>Ver</Text>
              </Pressable>
            </View>
          )}

          <ExpenseForm
            key={formKey}
            initialValues={initialValues}
            categories={categories}
            members={members}
            submitLabel="Salvar gasto"
            onSubmit={async changes => {
              await createExpense({
                ...changes,
                source: 'manual',
                rawText: null,
              });
              const category = categories.find(
                c => c.id === changes.categoryId,
              );
              setLastSaved({
                amountCents: changes.amountCents,
                categoryName: category?.name ?? '',
              });
              setFormKey(key => key + 1);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
