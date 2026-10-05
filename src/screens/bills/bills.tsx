import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CreditCardRow } from '../../db/billsSchema';
import {
  listBoletoInstallments,
  listCards,
  listInvoices,
  listPendingByMonth,
  payBoletoInstallment,
  type InstallmentItem,
  type Invoice,
} from '../../db/repositories/billsRepository';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { monthLabel, toYearMonth } from '../../features/bills/schedule';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

type Tab = 'cards' | 'boletos';

type CardWithInvoices = { card: CreditCardRow; invoices: Invoice[] };

function currentMonth(): string {
  const now = new Date();
  return toYearMonth(now.getFullYear(), now.getMonth());
}

/**
 * Cartões de crédito e boletos. Compras no cartão se juntam na fatura do
 * mês, que é paga de uma vez. Boletos são pagos um a um. Só depois de pago
 * algo vira gasto.
 */
export default function Bills() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('cards');
  const [cards, setCards] = useState<CardWithInvoices[]>([]);
  const [boletos, setBoletos] = useState<InstallmentItem[]>([]);
  const [dueThisMonth, setDueThisMonth] = useState(0);
  const [showPaidBoletos, setShowPaidBoletos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const cardRows = await listCards();
      const withInvoices = await Promise.all(
        cardRows.map(async card => ({
          card,
          invoices: await listInvoices(card.id),
        })),
      );
      const [boletoRows, pending] = await Promise.all([
        listBoletoInstallments(),
        listPendingByMonth(),
      ]);
      setCards(withInvoices);
      setBoletos(boletoRows);
      setDueThisMonth(
        pending
          .filter(p => p.referenceMonth <= currentMonth())
          .reduce((sum, p) => sum + p.totalCents, 0),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const confirmPayBoleto = (item: InstallmentItem) =>
    Alert.alert(
      'Marcar como pago?',
      `${item.description}${
        item.installmentsCount > 1
          ? ` (${item.number}/${item.installmentsCount})`
          : ''
      } de ${formatBRL(item.amountCents)} vira um gasto com a data de hoje.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: () =>
            payBoletoInstallment(item.id)
              .then(reload)
              .catch(err => setError(String(err?.message ?? err))),
        },
      ],
    );

  const visibleBoletos = boletos.filter(b => showPaidBoletos || !b.paidAt);

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>A pagar até este mês</Text>
          <Text style={styles.summaryValue}>{formatBRL(dueThisMonth)}</Text>
          <Text style={styles.summaryLabel}>
            Faturas e boletos vencidos ou que vencem em{' '}
            {monthLabel(currentMonth())}
          </Text>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(
            [
              ['cards', 'Cartões'],
              ['boletos', 'Boletos'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabSelected]}
            >
              <Text
                style={[styles.tabText, tab === key && styles.tabTextSelected]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {tab === 'cards' && (
          <>
            {cards.map(({ card, invoices }) => {
              // Faturas a pagar e as três últimas pagas.
              const open = invoices.filter(i => !i.paid);
              const paid = invoices.filter(i => i.paid).slice(-3);
              const shown = [...paid, ...open];
              return (
                <View key={card.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Feather
                      name="credit-card"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.cardTitle}>{card.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar cartão ${card.name}`}
                      hitSlop={10}
                      onPress={() =>
                        navigation.navigate('CardForm', { cardId: card.id })
                      }
                    >
                      <Feather
                        name="edit-2"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.meta}>
                    Fecha dia {card.closingDay} · vence dia {card.dueDay}
                  </Text>
                  {shown.length === 0 && (
                    <Text style={styles.hint}>
                      Nenhuma compra neste cartão.
                    </Text>
                  )}
                  {shown.map(invoice => (
                    <Pressable
                      key={invoice.referenceMonth}
                      accessibilityRole="button"
                      accessibilityLabel={`Fatura de ${monthLabel(
                        invoice.referenceMonth,
                      )}`}
                      onPress={() =>
                        navigation.navigate('Invoice', {
                          cardId: card.id,
                          month: invoice.referenceMonth,
                        })
                      }
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle}>
                          {monthLabel(invoice.referenceMonth)}
                        </Text>
                        <Text style={styles.meta}>
                          Vence {formatDayLabel(invoice.dueDate)} ·{' '}
                          {invoice.itemCount}{' '}
                          {invoice.itemCount === 1 ? 'parcela' : 'parcelas'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.badge,
                          invoice.paid ? styles.badgePaid : styles.badgeOpen,
                        ]}
                      >
                        {invoice.paid ? 'Paga' : 'A pagar'}
                      </Text>
                      <Text style={styles.amount}>
                        {formatBRL(invoice.totalCents)}
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              );
            })}

            {cards.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('PayableForm', { kind: 'card' })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Feather name="plus" size={18} color={colors.onPrimary} />
                <Text style={styles.primaryButtonText}>Compra no cartão</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('CardForm', {})}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="credit-card" size={16} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Novo cartão</Text>
            </Pressable>
          </>
        )}

        {tab === 'boletos' && (
          <>
            {visibleBoletos.length === 0 && (
              <View style={styles.empty}>
                <Feather name="file-text" size={28} color={colors.textMuted} />
                <Text style={styles.hint}>Nenhum boleto a pagar.</Text>
              </View>
            )}
            {visibleBoletos.length > 0 && (
              <View style={styles.card}>
                {visibleBoletos.map(item => (
                  <View key={item.id} style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>
                        {item.description}
                        {item.installmentsCount > 1
                          ? ` (${item.number}/${item.installmentsCount})`
                          : ''}
                      </Text>
                      <Text style={styles.meta}>
                        {item.paidAt
                          ? 'Pago'
                          : `Vence ${formatDayLabel(item.dueDate)}`}{' '}
                        · {item.categoryName}
                      </Text>
                    </View>
                    <Text style={styles.amount}>
                      {formatBRL(item.amountCents)}
                    </Text>
                    {!item.paidAt && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Pagar ${item.description}`}
                        onPress={() => confirmPayBoleto(item)}
                        style={({ pressed }) => [
                          styles.smallButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.smallButtonText}>Pagar</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPaidBoletos(v => !v)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.hint}>
                {showPaidBoletos
                  ? 'Esconder os pagos'
                  : 'Mostrar também os pagos'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('PayableForm', { kind: 'boleto' })
              }
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="plus" size={18} color={colors.onPrimary} />
              <Text style={styles.primaryButtonText}>Novo boleto</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
