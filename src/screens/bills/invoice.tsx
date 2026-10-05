import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  deletePayable,
  listInvoiceItems,
  payInvoice,
  type InstallmentItem,
} from '../../db/repositories/billsRepository';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { monthLabel, toYearMonth } from '../../features/bills/schedule';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

type Route = RootStackScreenProps<'Invoice'>['route'];

/** Fatura de um cartão num mês: as parcelas que caem nela e o pagamento. */
export default function InvoiceScreen() {
  const navigation = useNavigation();
  const { cardId, month } = useRoute<Route>().params;
  const [items, setItems] = useState<InstallmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await listInvoiceItems(cardId, month));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [cardId, month]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const total = items.reduce((sum, i) => sum + i.amountCents, 0);
  const unpaid = items.filter(i => !i.paidAt);
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.amountCents, 0);
  const now = new Date();
  const isFuture = month > toYearMonth(now.getFullYear(), now.getMonth());

  const confirmPay = () =>
    Alert.alert(
      isFuture ? 'Adiantar esta fatura?' : 'Pagar esta fatura?',
      `${unpaid.length} ${
        unpaid.length === 1 ? 'parcela' : 'parcelas'
      } somando ${formatBRL(unpaidTotal)} viram gastos com a data de hoje.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isFuture ? 'Adiantar' : 'Pagar',
          onPress: () =>
            payInvoice(cardId, month)
              .then(reload)
              .catch(err => setError(String(err?.message ?? err))),
        },
      ],
    );

  const confirmDelete = (item: InstallmentItem) =>
    Alert.alert(
      'Apagar esta compra?',
      `"${item.description}" sai de todas as faturas. Parcelas já pagas continuam como gastos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () =>
            deletePayable(item.payableId)
              .then(reload)
              .catch(err => setError(String(err?.message ?? err))),
        },
      ],
    );

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Fatura de {monthLabel(month)}</Text>
          <Text style={styles.summaryValue}>{formatBRL(total)}</Text>
          <Text style={styles.summaryLabel}>
            {unpaid.length === 0
              ? 'Paga'
              : `${formatBRL(unpaidTotal)} a pagar${
                  items[0] ? ` · vence ${formatDayLabel(items[0].dueDate)}` : ''
                }`}
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.card}>
          {items.length === 0 && (
            <Text style={styles.hint}>Nenhuma parcela nesta fatura.</Text>
          )}
          {items.map(item => (
            <View key={item.id} style={styles.row}>
              <Feather
                name={item.categoryIcon as FeatherIconName}
                size={16}
                color={colors.primary}
              />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {item.description}
                  {item.installmentsCount > 1
                    ? ` (${item.number}/${item.installmentsCount})`
                    : ''}
                </Text>
                <Text style={styles.meta}>
                  {item.categoryName} · {item.paidAt ? 'paga' : 'a pagar'}
                </Text>
              </View>
              <Text style={styles.amount}>{formatBRL(item.amountCents)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Apagar compra ${item.description}`}
                hitSlop={8}
                onPress={() => confirmDelete(item)}
              >
                <Feather name="trash-2" size={15} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>

        {unpaid.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={confirmPay}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="check" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>
              {isFuture ? 'Adiantar fatura' : 'Marcar fatura como paga'}
            </Text>
          </Pressable>
        )}
        {isFuture && unpaid.length > 0 && (
          <Text style={styles.hint}>
            Esta fatura ainda não venceu. Marcar como paga adianta estas
            parcelas.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('PayableForm', { kind: 'card', cardId })
          }
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Compra neste cartão</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
