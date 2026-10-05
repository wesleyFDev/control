import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import type {
  PluggyItemRow,
  PluggyTransactionRow,
} from '../../db/pluggySchema';
import {
  addPluggyItem,
  listPluggyAccounts,
  listPluggyItems,
  listPluggyTransactions,
  removePluggyItem,
  type PluggyAccountSummary,
} from '../../db/repositories/pluggyRepository';
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../../integrations/pluggy/credentialsStore';
import {
  syncPluggy,
  type SyncResult,
} from '../../integrations/pluggy/syncPluggy';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

/** Limite do plano gratuito do Meu Pluggy. */
const MAX_ITEMS = 5;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return 'nunca';
  }
  const date = new Date(iso);
  return `${date.toLocaleDateString('pt-BR')} às ${date
    .toLocaleTimeString('pt-BR')
    .slice(0, 5)}`;
}

/**
 * Integração com o Meu Pluggy. As credenciais ficam no Keychain/Keystore,
 * e contas e transações ficam nas tabelas `pluggy_*`, separadas dos gastos.
 * Nada é transformado em gasto ainda.
 */
export default function PluggyIntegration() {
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [items, setItems] = useState<PluggyItemRow[]>([]);
  const [newItemId, setNewItemId] = useState('');
  const [accounts, setAccounts] = useState<PluggyAccountSummary[]>([]);
  const [selected, setSelected] = useState<PluggyAccountSummary | null>(null);
  const [transactions, setTransactions] = useState<PluggyTransactionRow[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [credentials, itemRows, accountRows] = await Promise.all([
      loadCredentials(),
      listPluggyItems(),
      listPluggyAccounts(),
    ]);
    setSavedClientId(credentials?.clientId ?? null);
    setItems(itemRows);
    setAccounts(accountRows);
  }, []);

  useEffect(() => {
    reload().catch(err => setError(errorText(err)));
  }, [reload]);

  const run = async (label: string, task: () => Promise<void>) => {
    setError(null);
    setProgress(label);
    try {
      await task();
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setProgress(null);
    }
  };

  const save = () =>
    run('Guardando as credenciais...', async () => {
      await saveCredentials({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
      setClientId('');
      setClientSecret('');
    });

  const forget = () =>
    Alert.alert(
      'Apagar as credenciais?',
      'O app deixa de sincronizar. Os dados já baixados continuam no aparelho.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => run('Apagando...', clearCredentials),
        },
      ],
    );

  const addItem = () => {
    const id = newItemId.trim();
    if (!id) {
      return;
    }
    run('Adicionando o item...', async () => {
      await addPluggyItem(id);
      setNewItemId('');
    });
  };

  const sync = () =>
    run('Sincronizando...', async () => {
      const result = await syncPluggy(setProgress);
      setLastResult(result);
    });

  const openAccount = async (account: PluggyAccountSummary) => {
    setError(null);
    try {
      setTransactions(await listPluggyTransactions(account.id));
      setSelected(account);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const busy = progress !== null;
  const canSave = clientId.trim() !== '' && clientSecret.trim() !== '';
  const canSync = Boolean(savedClientId) && items.length > 0 && !busy;

  if (selected) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <ScrollView contentContainerStyle={styles.content}>
          <TransactionsView
            account={selected}
            transactions={transactions}
            onBack={() => setSelected(null)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <View style={styles.notice}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.noticeText}>
              Os dados da Pluggy ficam guardados separados dos seus gastos. Por
              enquanto nada vira gasto: a mesclagem vem depois. O Meu Pluggy
              atualiza os bancos a cada 24 horas.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Credenciais</Text>
          {savedClientId ? (
            <View style={styles.card}>
              <Text style={styles.accountName}>Guardadas no aparelho</Text>
              <Text style={styles.accountMeta}>
                Client ID {savedClientId.slice(0, 8)}…
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={forget}
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.dangerText}>Apagar credenciais</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={clientId}
                onChangeText={setClientId}
                placeholder="Client ID"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Client ID"
              />
              <TextInput
                value={clientSecret}
                onChangeText={setClientSecret}
                placeholder="Client Secret"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inputSpacing]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                accessibilityLabel="Client Secret"
              />
              <Text style={styles.hint}>
                Ficam no Keychain do iOS ou no Keystore do Android, nunca no
                banco do app.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={!canSave || busy}
                onPress={save}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                  (!canSave || busy) && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  Guardar credenciais
                </Text>
              </Pressable>
            </>
          )}

          <Text style={styles.sectionTitle}>
            Itens ({items.length}/{MAX_ITEMS})
          </Text>
          {items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.accountText}>
                <Text style={styles.itemId} numberOfLines={1}>
                  {item.id}
                </Text>
                <Text style={styles.accountMeta}>
                  Última sincronização: {formatDateTime(item.lastSyncedAt)}
                </Text>
                {item.lastError && (
                  <Text style={styles.error}>{item.lastError}</Text>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover item ${item.id}`}
                hitSlop={10}
                onPress={() =>
                  run('Removendo...', () => removePluggyItem(item.id))
                }
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {items.length < MAX_ITEMS && (
            <View style={styles.addRow}>
              <TextInput
                value={newItemId}
                onChangeText={setNewItemId}
                onSubmitEditing={addItem}
                placeholder="Cole um itemId do Dashboard"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.addInput]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Novo itemId"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar item"
                disabled={!newItemId.trim() || busy}
                onPress={addItem}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                  (!newItemId.trim() || busy) && styles.disabled,
                ]}
              >
                <Feather name="plus" size={20} color={colors.primary} />
              </Pressable>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={!canSync}
            onPress={sync}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              !canSync && styles.disabled,
            ]}
          >
            <Feather name="refresh-cw" size={16} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Sincronizar agora</Text>
          </Pressable>

          {progress && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.hint}>{progress}</Text>
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          {lastResult && !busy && (
            <Text style={styles.hint}>
              Última sincronização: {lastResult.items} item(ns),{' '}
              {lastResult.accounts} conta(s) e {lastResult.transactions}{' '}
              transação(ões) recebidas
              {lastResult.errors.length > 0
                ? `, ${lastResult.errors.length} item(ns) com erro.`
                : '.'}
            </Text>
          )}

          {accounts.length > 0 && (
            <Text style={styles.sectionTitle}>Contas guardadas</Text>
          )}
          {accounts.map(account => (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver transações de ${account.name}`}
              onPress={() => openAccount(account)}
              style={({ pressed }) => [
                styles.accountCard,
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name={account.type === 'CREDIT' ? 'credit-card' : 'briefcase'}
                size={18}
                color={colors.primary}
              />
              <View style={styles.accountText}>
                <Text style={styles.accountName}>
                  {account.marketingName || account.name}
                </Text>
                <Text style={styles.accountMeta}>
                  {account.type === 'CREDIT' ? 'Cartão' : 'Conta'} ·{' '}
                  {account.transactionCount} transações ·{' '}
                  {account.candidateCount} possíveis gastos
                </Text>
              </View>
              <Text style={styles.accountBalance}>
                {formatBRL(account.balanceCents)}
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TransactionsView({
  account,
  transactions,
  onBack,
}: {
  account: PluggyAccountSummary;
  transactions: PluggyTransactionRow[];
  onBack: () => void;
}) {
  return (
    <View style={styles.previewContainer}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Feather name="arrow-left" size={16} color={colors.primary} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      <Text style={styles.cardTitle}>
        {account.marketingName || account.name}
      </Text>
      <Text style={styles.hint}>
        {account.transactionCount} transações guardadas, das quais{' '}
        {account.candidateCount} virariam gastos. Mostrando as{' '}
        {transactions.length} mais recentes.
      </Text>

      {transactions.map(transaction => (
        <View key={transaction.id} style={styles.transaction}>
          <View style={styles.transactionText}>
            <Text style={styles.transactionDescription} numberOfLines={2}>
              {transaction.description}
            </Text>
            <Text style={styles.accountMeta}>
              {formatDayLabel(transaction.date)}
              {transaction.operationType
                ? ` · ${transaction.operationType}`
                : ''}
              {transaction.status === 'PENDING' ? ' · pendente' : ''}
              {transaction.category ? ` · ${transaction.category}` : ''}
            </Text>
            <Text
              style={[
                styles.verdict,
                transaction.isExpenseCandidate
                  ? styles.verdictYes
                  : styles.verdictNo,
              ]}
            >
              {transaction.isExpenseCandidate
                ? 'Viraria gasto'
                : `Ignorada: ${transaction.ignoreReason}`}
            </Text>
          </View>
          <Text style={styles.transactionAmount}>
            {formatBRL(transaction.amountCents)}
          </Text>
        </View>
      ))}
    </View>
  );
}
