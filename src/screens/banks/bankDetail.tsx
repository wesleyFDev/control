import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import type { PluggyAccountRow } from '../../db/pluggySchema';
import { getSelfMemberId } from '../../db/repositories/lookupsRepository';
import {
  getBank,
  listBankTransactions,
  transferToExpenses,
  undoTransfer,
  type BankSummary,
  type BankTransaction,
  type BankTransactionFilter,
} from '../../db/repositories/pluggyRepository';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import {
  bankName,
  formatMoment,
  isCreditAccount,
  shortDay,
} from './bankFormat';
import { styles } from './style';
import TransferSheet, { type TransferDraft } from './transferSheet';

type Tab = 'debit' | 'credit';

const FILTERS: [BankTransactionFilter, string][] = [
  ['pending', 'A passar'],
  ['transferred', 'Já passadas'],
  ['ignored', 'Ignoradas'],
  ['all', 'Todas'],
];

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Entrada de dinheiro: crédito na conta, ou pagamento e estorno no cartão. */
function isIncoming(t: BankTransaction, account: PluggyAccountRow): boolean {
  return isCreditAccount(account.type)
    ? t.amountCents < 0
    : t.type === 'CREDIT';
}

/**
 * Contas (débito) e cartões (crédito) de um banco, com saldo ou limite e as
 * transações. Daqui o usuário passa transações para os gastos do app.
 */
export default function BankDetail({
  route,
  navigation,
}: RootStackScreenProps<'BankDetail'>) {
  const { itemId } = route.params;
  const [bank, setBank] = useState<BankSummary | null>(null);
  const [tab, setTab] = useState<Tab>('debit');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BankTransactionFilter>('pending');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountsOfTab = useMemo(
    () =>
      (bank?.accounts ?? []).filter(
        a => isCreditAccount(a.type) === (tab === 'credit'),
      ),
    [bank, tab],
  );
  const account =
    accountsOfTab.find(a => a.id === accountId) ?? accountsOfTab[0] ?? null;

  const loadBank = useCallback(async () => {
    try {
      const next = await getBank(itemId);
      setBank(next);
      if (next) {
        navigation.setOptions({ title: bankName(next.item) });
        // Abre na aba que tem conta, começando pelo débito.
        if (!next.accounts.some(a => !isCreditAccount(a.type))) {
          setTab('credit');
        }
      }
    } catch (err) {
      setError(errorText(err));
    }
  }, [itemId, navigation]);

  const loadTransactions = useCallback(async () => {
    if (!account) {
      setTransactions([]);
      return;
    }
    try {
      setTransactions(await listBankTransactions(account.id, filter));
    } catch (err) {
      setError(errorText(err));
    }
  }, [account, filter]);

  useFocusEffect(
    useCallback(() => {
      loadBank();
    }, [loadBank]),
  );

  useEffect(() => {
    setSelected(new Set());
    loadTransactions();
  }, [loadTransactions]);

  const toggle = (id: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const selectable = transactions.filter(t => !t.transferred);
  const allSelected =
    selectable.length > 0 && selectable.every(t => selected.has(t.id));
  const selectedRows = transactions.filter(t => selected.has(t.id));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map(t => t.id)));

  const confirmTransfer = async (
    scope: 'personal' | 'family',
    drafts: TransferDraft[],
  ) => {
    try {
      const memberId = scope === 'personal' ? await getSelfMemberId() : null;
      const created = await transferToExpenses(drafts, { scope, memberId });
      setSheetOpen(false);
      setSelected(new Set());
      setMessage(
        `${created} ${created === 1 ? 'gasto criado' : 'gastos criados'}.`,
      );
      setError(null);
      await loadTransactions();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const confirmUndo = (t: BankTransaction) =>
    Alert.alert(
      'Desfazer?',
      `O gasto criado a partir de "${t.description}" será apagado. A transação volta para "A passar".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desfazer',
          style: 'destructive',
          onPress: () =>
            undoTransfer(t.id)
              .then(loadTransactions)
              .catch(err => setError(errorText(err))),
        },
      ],
    );

  if (!bank) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <View style={styles.empty}>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>Carregando...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          selected.size > 0 && styles.contentWithBar,
        ]}
      >
        <Text style={styles.meta}>
          Atualizado pelo banco: {formatMoment(bank.item.bankUpdatedAt)} ·
          Baixado no app: {formatMoment(bank.item.lastSyncedAt)}
        </Text>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(
            [
              ['debit', 'Débito'],
              ['credit', 'Crédito'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => {
                setTab(key);
                setAccountId(null);
              }}
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

        {accountsOfTab.length > 1 && (
          <View style={styles.chips}>
            {accountsOfTab.map(a => (
              <Chip
                key={a.id}
                label={a.marketingName ?? a.name}
                selected={account?.id === a.id}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </View>
        )}

        {!account && (
          <View style={styles.empty}>
            <Feather
              name={tab === 'credit' ? 'credit-card' : 'dollar-sign'}
              size={28}
              color={colors.textMuted}
            />
            <Text style={styles.hint}>
              {tab === 'credit'
                ? 'Nenhum cartão de crédito neste banco.'
                : 'Nenhuma conta corrente neste banco.'}
            </Text>
          </View>
        )}

        {account && <AccountSummary account={account} />}

        {account && tab === 'credit' && (
          <Text style={styles.hint}>
            Se você também lança este cartão em "Contas a pagar", não passe as
            compras daqui: a mesma compra contaria duas vezes.
          </Text>
        )}

        {account && (
          <>
            <View style={styles.chips}>
              {FILTERS.map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={filter === key}
                  onPress={() => setFilter(key)}
                />
              ))}
            </View>

            {message && <Text style={styles.hint}>{message}</Text>}
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.rowTitle, styles.flex]}>
                  {transactions.length}{' '}
                  {transactions.length === 1 ? 'transação' : 'transações'}
                </Text>
                {selectable.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={toggleAll}
                  >
                    <Text style={styles.linkText}>
                      {allSelected ? 'Limpar seleção' : 'Selecionar todas'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {transactions.length === 0 && (
                <Text style={styles.hint}>Nada com esse filtro.</Text>
              )}

              {transactions.map(t => {
                const incoming = isIncoming(t, account);
                const checked = selected.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked,
                      disabled: t.transferred,
                    }}
                    disabled={t.transferred}
                    onPress={() => toggle(t.id)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.pressed,
                    ]}
                  >
                    {t.transferred ? (
                      <View style={styles.checkboxSpacer} />
                    ) : (
                      <View
                        style={[
                          styles.checkbox,
                          checked && styles.checkboxChecked,
                        ]}
                      >
                        {checked && (
                          <Feather
                            name="check"
                            size={14}
                            color={colors.onPrimary}
                          />
                        )}
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {t.description}
                      </Text>
                      <Text style={styles.meta}>
                        {formatDayLabel(t.date)}
                        {t.totalInstallments
                          ? ` · parcela ${t.installmentNumber}/${t.totalInstallments}`
                          : ''}
                      </Text>
                      <View style={styles.badges}>
                        {t.transferred && (
                          <Text style={[styles.badge, styles.badgeDone]}>
                            No app
                          </Text>
                        )}
                        {t.status === 'PENDING' && (
                          <Text style={[styles.badge, styles.badgePending]}>
                            Pendente
                          </Text>
                        )}
                        {!t.isExpenseCandidate && t.ignoreReason && (
                          <Text style={[styles.badge, styles.badgeMuted]}>
                            {t.ignoreReason}
                          </Text>
                        )}
                      </View>
                      {t.transferred && (
                        <Pressable
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => confirmUndo(t)}
                        >
                          <Text style={styles.linkText}>Desfazer</Text>
                        </Pressable>
                      )}
                    </View>
                    <Text style={[styles.amount, incoming && styles.amountIn]}>
                      {incoming ? '+' : ''}
                      {formatBRL(Math.abs(t.amountCents))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {selected.size > 0 && (
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather
              name="arrow-right-circle"
              size={18}
              color={colors.onPrimary}
            />
            <Text style={styles.primaryButtonText}>
              Passar {selected.size} para os gastos
            </Text>
          </Pressable>
        </View>
      )}

      <TransferSheet
        visible={sheetOpen}
        transactions={selectedRows}
        onCancel={() => setSheetOpen(false)}
        onConfirm={confirmTransfer}
      />
    </SafeAreaView>
  );
}

function AccountSummary({ account }: { account: PluggyAccountRow }) {
  if (!isCreditAccount(account.type)) {
    return (
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          Saldo · {account.marketingName ?? account.name}
        </Text>
        <Text style={styles.summaryValue}>
          {formatBRL(account.balanceCents)}
        </Text>
        {account.number && (
          <Text style={styles.summaryLabel}>Conta {account.number}</Text>
        )}
      </View>
    );
  }

  const limit = account.creditLimitCents;
  const available = account.availableCreditLimitCents;
  const used = limit !== null && available !== null ? limit - available : null;
  const usedRatio =
    limit && used !== null ? Math.min(1, Math.max(0, used / limit)) : 0;

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>
        Limite disponível · {account.marketingName ?? account.name}
      </Text>
      <Text style={styles.summaryValue}>
        {available !== null ? formatBRL(available) : '—'}
      </Text>
      {limit !== null && (
        <View style={styles.limitBar}>
          <View
            style={[styles.limitBarFill, { width: `${usedRatio * 100}%` }]}
          />
        </View>
      )}
      <View style={styles.summaryGrid}>
        <SummaryCell
          label="Limite total"
          value={limit !== null ? formatBRL(limit) : '—'}
        />
        <SummaryCell
          label="Usado"
          value={used !== null ? formatBRL(used) : '—'}
        />
        <SummaryCell
          label="Fatura atual"
          value={formatBRL(account.balanceCents)}
        />
        <SummaryCell
          label="Fecha · vence"
          value={`${shortDay(account.balanceCloseDate)} · ${shortDay(
            account.balanceDueDate,
          )}`}
        />
      </View>
    </View>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryCellValue}>{value}</Text>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
